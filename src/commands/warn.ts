import { SlashCommandBuilder } from "@discordjs/builders";
import {
  Client,
  CommandInteraction,
  GuildMember,
  MessageEmbed,
  Permissions
} from "discord.js";
import { config } from "../config";
import Bans from "../models/banModel";
import Warns from "../models/warnModel";
import { epochConverter } from "../utils/timeUtils";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Anna varoitus käyttäjälle!")
    .setDefaultPermission(false)
    .addUserOption((option) =>
      option
        .setName("käyttäjä")
        .setDescription("Käyttäjä, jolle haluat antaa porttikiellon?")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("syy")
        .setDescription("Miksi porttikielto annetaan käyttäjälle?")
        .setRequired(true)
    )
    .addBooleanOption((option) =>
      option
        .setName("hiljainen")
        .setDescription("Haluatko varoituksen olevan hiljainen (-s)?")
        .setRequired(true)
    ),

  async execute(client: Client, interaction: CommandInteraction) {
    const member = interaction.options.getMember("käyttäjä", true);
    const user = interaction.options.getUser("käyttäjä", true);
    const reason = interaction.options.getString("syy", true);
    const silent = interaction.options.getBoolean("hiljainen", true);

    if (!(member instanceof GuildMember)) return;

    const errorEmbedBase = new MessageEmbed()
      .setColor(config.COLORS.ERROR)
      .setImage("https://i.stack.imgur.com/Fzh0w.png")
      .setAuthor({
        name: "Tapahtui virhe",
        iconURL: client.user?.displayAvatarURL()
      })
      .setFooter({
        text: interaction.user.username,
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTimestamp();

    if (!user?.id) {
      errorEmbedBase.setDescription(
        `Kyseistä käyttäjää ei löytynyt! Käyttäjä on todennäköisesti poistunut palvelimelta!`
      );
      return interaction.reply({ embeds: [errorEmbedBase], ephemeral: true });
    }

    // Validation
    const isBanned = await Bans.findOne({ userId: user.id, active: true });
    if (isBanned) {
      errorEmbedBase.setDescription(
        `Käyttäjällä **${user.tag}** on porttikielto! Et voi varoittaa käyttäjää jolla on aktiivinen porttikielto!`
      );
      return interaction.reply({ embeds: [errorEmbedBase], ephemeral: true });
    }
    if (user.bot) {
      errorEmbedBase.setDescription(`Et voi antaa varoitusta botille!`);
      return interaction.reply({ embeds: [errorEmbedBase], ephemeral: true });
    }
    if (user.id === interaction.user.id) {
      errorEmbedBase.setDescription(`Et voi antaa varoitusta itsellesi!`);
      return interaction.reply({ embeds: [errorEmbedBase], ephemeral: true });
    }
    if (member.permissions.has(Permissions.FLAGS.ADMINISTRATOR)) {
      errorEmbedBase.setDescription(
        `Et voi antaa varoitusta tälle henkilölle!`
      );
      return interaction.reply({ embeds: [errorEmbedBase], ephemeral: true });
    }
    if (reason.length < 4 || reason.length > 200) {
      errorEmbedBase.setDescription(
        `Varoituksen syyn täytyy olla 4-200 merkkiä pitkä!`
      );
      return interaction.reply({ embeds: [errorEmbedBase], ephemeral: true });
    }

    // Initialize warning expiry date based on config
    const warnExpiresAt = new Date();
    warnExpiresAt.setDate(warnExpiresAt.getDate() + config.WARN_EXPIRES);

    const newWarn = new Warns({
      userId: member.id,
      username: `${member.user.tag}`,

      authorId: interaction.user.id,
      authorName: `${interaction.user.tag}`,

      reason,
      expiresAt: warnExpiresAt
    });
    await newWarn.save();

    // If active warning are above threshhold then ban user
    const activeWarns = await Warns.find({ userId: member.id, active: true });
    if (activeWarns.length === config.WARN_THRESHOLD) {
      // Get user's roles before banning
      const userRoles: string[] = [];
      await member.roles.cache
        .sort((a, b) => b.position - a.position)
        .map((r) => r)
        .forEach((role) => {
          if (role.name !== "@everyone") {
            userRoles.push(role.id);
          }
        });
      await member.roles.set([]);

      // Add ban role
      member.roles.add(config.BAN_ROLE);

      // Initialize ban expiry date based on config
      const banExpiresAt = new Date();
      banExpiresAt.setDate(banExpiresAt.getDate() + config.WARN_BAN_DAYS);

      const newBan = new Bans({
        userId: member.id,
        username: `${member.user.tag}`,

        authorId: interaction.user.id,
        authorName: `${interaction.user.tag}`,

        roles: userRoles,

        reason: `${config.WARN_THRESHOLD} aktiivista varoitusta`,
        length: config.WARN_BAN_DAYS,
        expiresAt: banExpiresAt
      });
      await newBan.save();

      // Set warning inactive after banning
      await Warns.updateMany(
        { userId: member.id },
        { $set: { active: false } }
      );

      const banEmbed = new MessageEmbed()
        .setColor(config.COLORS.SUCCESS)
        .setImage("https://i.stack.imgur.com/Fzh0w.png")
        .setAuthor({
          name: "Porttikielto myönnetty",
          iconURL: client.user?.displayAvatarURL()
        })
        .setDescription(
          `Käyttäjälle **${member.user.tag}** on myönnetty porttikielto!`
        )
        .addFields([
          { name: "Käyttäjä", value: `${member.user.tag}`, inline: true },
          {
            name: "Syynä",
            value: `${config.WARN_THRESHOLD} aktiivista varoitusta`,
            inline: true
          },
          {
            name: "Rankaisija",
            value: `${interaction.user.username}`,
            inline: true
          },
          {
            name: "Annettu",
            value: `<t:${epochConverter(new Date())}:R>`,
            inline: true
          },
          {
            name: "Kesto",
            value: `${config.WARN_BAN_DAYS} päivää`,
            inline: true
          },
          {
            name: "Loppuu",
            value: `<t:${epochConverter(banExpiresAt)}:R>`,
            inline: true
          }
        ])
        .addField("\u200B", "\u200B", false)
        .setFooter({
          text: interaction.user.username,
          iconURL: interaction.user.displayAvatarURL()
        })
        .setTimestamp();

      for (let x = 0; x < activeWarns.length; x++) {
        const warn = activeWarns[x];
        banEmbed.addField(
          `Varoitus ${x + 1}`,
          `**${warn.authorName}** varoitti syystä: **${
            warn.reason
          }** (${`<t:${epochConverter(warn.createdAt)}:R>`})`
        );
      }

      interaction.reply({ embeds: [banEmbed], ephemeral: silent });

      // Try notifying user about the ban
      member
        .send({
          // eslint-disable-next-line max-len
          content: `Olet saanut porttikiellon palvelimella **${interaction.guild?.name}**.`,
          embeds: [banEmbed]
        })
        .catch((e) => {
          if (e?.code === 50007 && silent) {
            return interaction.followUp({
              // eslint-disable-next-line max-len
              content: `<@${interaction.user.id}> Käyttäjälle **${member.user.tag}** ei voitu toimittaa tietoa porttikiellosta yksityisviestitse, eikä käyttäjä nää ylläolevaa porttikieltoviestiä, koska hiljaista tilaa on käytetty!.`,
              ephemeral: true
            });
          }
        });
      return;
    }
    const warnEmbed = new MessageEmbed()
      .setColor(config.COLORS.SUCCESS)
      .setImage("https://i.stack.imgur.com/Fzh0w.png")
      .setAuthor({
        name: "Käyttäjää varoitettu",
        iconURL: client.user?.displayAvatarURL()
      })
      .setDescription(`Käyttäjälle **${member.user.tag}** on annettu varoitus!`)
      .addFields([
        { name: "Käyttäjä", value: `${member.user.tag}`, inline: true },
        { name: "Syynä", value: `${reason}`, inline: true },
        {
          name: "Rankaisija",
          value: `${interaction.user.username}`,
          inline: true
        },
        {
          name: "Annettu",
          value: `<t:${epochConverter(new Date())}:R>`,
          inline: true
        },
        {
          name: "Kesto",
          value: `${config.WARN_EXPIRES} päivää`,
          inline: true
        },
        {
          name: "Vanhenee",
          value: `<t:${epochConverter(warnExpiresAt)}:R>`,
          inline: true
        },
        {
          name: "Aktiiviset varoitukset",
          value: `${
            activeWarns
              ? `${activeWarns.length}/${config.WARN_THRESHOLD}`
              : `0/${config.WARN_THRESHOLD}`
          }`,
          inline: true
        }
      ])
      .setFooter({
        text: interaction.user.username,
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTimestamp();

    await interaction.reply({ embeds: [warnEmbed], ephemeral: silent });

    // Try notifying user about the warn
    member
      .send({
        // eslint-disable-next-line max-len
        content: `Olet saanut varoituksen palvelimella **${interaction.guild?.name}**. Mikäli saavutat ${config.WARN_THRESHOLD} aktiivista varoitusta saat porttikiellon palvelimelta ${config.WARN_BAN_DAYS} päivän ajaksi. Tässä vielä muistutus varoituksestasi :)`,
        embeds: [warnEmbed]
      })
      .catch((e) => {
        if (e?.code === 50007 && silent) {
          return interaction.followUp({
            // eslint-disable-next-line max-len
            content: `<@${interaction.user.id}> Käyttäjälle **${member.user.tag}** ei voitu toimittaa tietoa varoituksesta yksityisviestitse, eikä käyttäjä nää ylläolevaa varoitusviestiä, koska hiljaista tilaa on käytetty! Käyttäjä ei ole tietoinen saadusta varoituksesta.`,
            ephemeral: true
          });
        }
      });
  }
};
