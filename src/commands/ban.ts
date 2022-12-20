import { SlashCommandBuilder } from "@discordjs/builders";
import {
  Client,
  CommandInteraction, EmbedBuilder, GuildMember,
  HexColorString,
  PermissionsBitField
} from "discord.js";
import { config } from "../config";
import Bans from "../models/banModel";
import { epochConverter } from "../utils/timeUtils";
import { purgeMessages } from "./purge";

export default {
  data: new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Anna porttikielto käyttäjälle!")
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
        .setDescription("Haluatko porttikiellon olevan hiljainen (-s)?")
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("aika")
        .setDescription("Kuinka monta päivää porttikielto kestää?")
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("puhdista")
        .setDescription("Poistetaanko käyttäjän viestejä ajalta:")
        .addChoices(
          {
            name: "24h",
            value: "1"
          },
          {
            name: "4d",
            value: "4"
          },
          {
            name: "7d",
            value: "7"
          }
        )
        .setRequired(false)
    ),

  async execute(client: Client, interaction: CommandInteraction) {

    if (!interaction.isChatInputCommand()) return;

    const user = interaction.options.getUser("käyttäjä", true);
    const member = interaction.options.getMember("käyttäjä");
    const reason = interaction.options.getString("syy", true);
    const silent = interaction.options.getBoolean("hiljainen", true);
    const deleteMessages = interaction.options.getString("puhdista");
    const days = interaction.options.getInteger("aika");

    await interaction.deferReply({ ephemeral: silent ?? false });

    if (!(member instanceof GuildMember)) return;

    const errorEmbedBase = new EmbedBuilder()
      .setColor(config.COLORS.ERROR as HexColorString)
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

    if (!user.id || !member) {
      errorEmbedBase.setDescription(
        `Kyseistä käyttäjää ei löytynyt! Käyttäjä on todennäköisesti poistunut palvelimelta!`
      );
      return interaction.editReply({
        embeds: [errorEmbedBase]
      });
    }

    const isBanned = await Bans.findOne({ userId: user.id, active: true });
    if (isBanned) {
      errorEmbedBase
        .setDescription(`Käyttäjällä **${user.tag}** on jo porttikielto!`)
        .addFields([
          { name: "Käyttäjä", value: `${isBanned.username}`, inline: true },
          { name: "Syynä", value: `${isBanned.reason}`, inline: true },
          { name: "Rankaisija", value: `${isBanned.authorName}`, inline: true },
          {
            name: "Annettu",
            value: `<t:${epochConverter(isBanned.createdAt)}:R>`,
            inline: true
          },
          {
            name: "Kesto",
            value: isBanned.length
              ? `${isBanned.length} päivää`
              : "**Ikuinen**",
            inline: true
          },
          isBanned.expiresAt
            ? {
              name: "Loppuu",
              value: `<t:${epochConverter(isBanned.expiresAt)}:R>`,
              inline: true
            }
            : { name: "\u200B", value: `\u200B`, inline: true }
        ]);
      return interaction.editReply({
        embeds: [errorEmbedBase]
      });
    }

    // Validation
    if (user.bot) {
      errorEmbedBase.setDescription(`Et voi antaa porttikieltoa botille!`);
      return interaction.editReply({
        embeds: [errorEmbedBase]
      });
    }

    if (user.id === interaction.user.id) {
      errorEmbedBase.setDescription(`Et voi antaa porttikieltoa itsellesi!`);
      return interaction.editReply({
        embeds: [errorEmbedBase]
      });
    }
    if (member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      errorEmbedBase.setDescription(
        `Et voi antaa porttikieltoa ylläpitäjälle!`
      );
      return interaction.editReply({
        embeds: [errorEmbedBase]
      });
    }
    if (reason.length < 4 || reason.length > 200) {
      errorEmbedBase.setDescription(
        `Porttikiellon syyn täytyy olla 4-200 merkkiä pitkä!`
      );
      return interaction.editReply({
        embeds: [errorEmbedBase]
      });
    }
    if (days && (days < 1 || days > 365)) {
      errorEmbedBase.setDescription(
        `Porttikiellon keston täytyy olla 1-365 päivää! Voit myös antaa ikuisen porttikiellon jättämällä aika-arvon huomioimatta.`
      );
      return interaction.editReply({
        embeds: [errorEmbedBase]
      });
    }

    if (deleteMessages)
      await purgeMessages(interaction, member, parseInt(deleteMessages));

    // Save user roles before ban
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
    member.roles.add(config.BAN_ROLE);

    // Initialize ban expiry date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (days ?? 0));

    const newBan = new Bans({
      userId: member.id,
      username: `${member.user.tag}`,

      authorId: interaction.user.id,
      authorName: `${interaction.user.tag}`,

      roles: userRoles,

      reason,
      length: days || null,
      expiresAt: days ? expiresAt : null
    });
    await newBan.save();
    const banEmbed = new EmbedBuilder()
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
          value: days ? `${days} päivää` : "**Ikuinen**",
          inline: true
        },
        days
          ? {
            name: "Loppuu",
            value: `<t:${epochConverter(expiresAt)}:R>`,
            inline: true
          }
          : { name: "\u200B", value: `\u200B`, inline: true }
      ])
      .setFooter({
        text: interaction.user.username,
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTimestamp();

    interaction.editReply({ embeds: [banEmbed] });
  }
};
