import { SlashCommandBuilder } from "@discordjs/builders";
import { Client, CommandInteraction, MessageEmbed } from "discord.js";
import { config } from "../config";
import Bans from "../models/banModel";
import Mutes from "../models/muteModel";
import Warns from "../models/warnModel";
import { paginationHandler } from "../utils/paginationHandler";
import { daysAgo, epochConverter } from "../utils/timeUtils";

export default {
  data: new SlashCommandBuilder()
    .setName("history")
    .setDescription("Katso käyttäjän rikehistoria!")
    .setDefaultPermission(false)
    .addUserOption((option) =>
      option
        .setName("käyttäjä")
        .setDescription("Käyttäjä, jonka rikkeet haluat tarkastaa?")
        .setRequired(true)
    )
    .addBooleanOption((option) =>
      option
        .setName("hiljainen")
        .setDescription("Haluatko historian olevan hiljainen (-s)?")
        .setRequired(true)
    ),

  async execute(client: Client, interaction: CommandInteraction) {
    const member = interaction.options.getMember("käyttäjä");
    const user = interaction.options.getUser("käyttäjä");
    const silent = interaction.options.getBoolean("hiljainen");

    await interaction.deferReply({ ephemeral: silent ?? false });

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

    const infractionTypes = ["porttikielto", "varoitus", "mykistys"];

    const totalBans = (await Bans.find({ userId: user.id }).lean())?.map(
      (item) => Object.assign({}, item, { type: infractionTypes[0] })
    );
    const totalWarns = (await Warns.find({ userId: user.id }).lean())?.map(
      (item) => Object.assign({}, item, { type: infractionTypes[1] })
    );
    const totalMutes = (await Mutes.find({ userId: user.id }).lean())?.map(
      (item) => Object.assign({}, item, { type: infractionTypes[2] })
    );
    const activeBans = totalBans.filter((ban) => ban.expiration.active);
    const activeWarns = totalWarns.filter((warn) => warn.expiration.active);
    const activeMutes = totalMutes.filter((mute) => mute.expiration.active);

    if (
      (!totalBans && !totalWarns && !totalMutes) ||
      (totalBans.length === 0 &&
        totalWarns.length === 0 &&
        totalMutes.length === 0)
    ) {
      const errorEmbed = errorEmbedBase.setDescription(
        "Käyttäjällä ei ole rikehistoriaa!"
      );
      return interaction.editReply({ embeds: [errorEmbed] });
    }

    // Combine totalBans and totalWarns into one array and sort it by date
    const combinedInfractions = [...totalBans, ...totalWarns, ...totalMutes];
    combinedInfractions.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );

    const historyEmbed = new MessageEmbed()
      .setColor(config.COLORS.SUCCESS)
      .setImage("https://i.stack.imgur.com/Fzh0w.png")
      .setAuthor({
        name: `Rikehistoria tiedot ${
          combinedInfractions.length > 0
            ? `(1/${combinedInfractions.length + 1})`
            : ``
        }`,
        iconURL: client.user?.displayAvatarURL()
      })
      .setDescription(`Käyttäjän **${user.tag}** rikehistoria!`)
      .setFooter({
        text: interaction.user.username,
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTimestamp();

    // Warning fields
    historyEmbed.addFields([
      {
        name: "Varoituksia yhteensä",
        value: `${totalWarns.length}`,
        inline: true
      },
      {
        name: "Aktiiviset varoitukset",
        value: `${activeWarns.length}`,
        inline: true
      },
      { name: "\u200B", value: `\u200B`, inline: true }
    ]);
    if (activeWarns.length > 0) {
      const activeWarnsFormatted = [];
      for (let x = 0; x < activeWarns.length; x++) {
        const warn = activeWarns[x];
        activeWarnsFormatted.push(
          `\`\`\`yaml\n${x + 1}: ${warn.author.username} varoitti syystä "${
            warn.reason
          }" # (${`${daysAgo(warn.createdAt)}`})\`\`\``
        );
      }
      historyEmbed.addField(
        "Aktiiviset varoitukset",
        `${activeWarnsFormatted.join("")}`,
        false
      );
    }

    // Mute fields
    historyEmbed.addFields([
      {
        name: "Mykistyksiä yhteensä",
        value: `${totalMutes.length}`,
        inline: true
      },
      {
        name: "Aktiivinen mykistys",
        value: `${
          activeMutes.length > 0
            ? activeMutes[0]?.expiration.length
              ? `Kyllä (_${activeMutes[0].expiration.length} päivää_)`
              : "__Ikuinen__"
            : "Ei"
        }`,
        inline: true
      },
      { name: "\u200B", value: `\u200B`, inline: true }
    ]);

    // Ban fields
    historyEmbed.addFields([
      {
        name: "Porttikieltoja yhteensä",
        value: `${totalBans.length}`,
        inline: true
      },
      {
        name: "Aktiivinen porttikielto",
        value: `${
          activeBans.length > 0
            ? activeBans[0]?.expiration.length
              ? `Kyllä (_${activeBans[0].expiration.length} päivää_)`
              : "__Ikuinen__"
            : "Ei"
        }`,
        inline: true
      },
      { name: "\u200B", value: `\u200B`, inline: true }
    ]);
    if (activeBans.length > 0) {
      historyEmbed.addFields([
        {
          name: "Porttikielto vanhenee",
          value: activeBans[0].expiration.expiresAt
            ? `<t:${epochConverter(activeBans[0].expiration.expiresAt)}:R>`
            : "__Ikuinen__",
          inline: true
        },
        {
          name: "Porttikiellon antaja",
          value: `${activeBans[0].author.username}`,
          inline: true
        },
        {
          name: "Porttikiellon syy",
          value: `${activeBans[0].reason}`,
          inline: true
        }
      ]);
    }
    const infinfractionsEmbeds = [];
    infinfractionsEmbeds.push(historyEmbed);

    combinedInfractions.forEach((infraction, index) => {
      const infinfractionsEmbed = new MessageEmbed()
        .setColor(
          infraction.expiration.active
            ? config.COLORS.SUCCESS
            : config.COLORS.WARNING
        )
        .setImage("https://i.stack.imgur.com/Fzh0w.png")
        .setAuthor({
          name: `${
            infraction.type.charAt(0).toUpperCase() +
            infraction.type.substring(1)
          } (${index + 2}/${combinedInfractions.length + 1})`,
          iconURL: client.user?.displayAvatarURL()
        })
        .setDescription(
          `Käyttäjälle **${infraction.user.username}** on myönnetty ${infraction.type}!`
        )
        .setFooter({
          text: interaction.user.username,
          iconURL: interaction.user.displayAvatarURL()
        })
        .setTimestamp()
        .addFields([
          {
            name: "Käyttäjä",
            value: `${infraction.user.username}`,
            inline: true
          },
          { name: "Syynä", value: `${infraction.reason}`, inline: true },
          {
            name: "Rankaisija",
            value: `${infraction.author.username}`,
            inline: true
          },
          {
            name: "Annettu",
            value: `<t:${epochConverter(infraction.createdAt)}:R>`,
            inline: true
          },
          infraction.type === "porttikielto" || infraction.type === "mykistys"
            ? {
                name: "Kesto",
                value: infraction.expiration.length
                  ? `${infraction.expiration.length} päivää`
                  : "**Ikuinen**",
                inline: true
              }
            : {
                name: "Kesto",
                value: `${config.WARN_EXPIRES} päivää`,
                inline: true
              },
          infraction.expiration.length && !infraction.expiration.removedBy
            ? {
                name: "Vanhenee",
                value: `<t:${epochConverter(
                  infraction.expiration.expiresAt as Date
                )}:R>`,
                inline: true
              }
            : { name: "\u200B", value: `\u200B`, inline: true }
        ]);
      if (infraction.expiration.removedBy) {
        infinfractionsEmbed
          .addField(
            "Poistettu manuaalisesti",
            `<t:${epochConverter(infraction.expiration.removedAt as Date)}:R>`,
            true
          )
          .addField("Poistaja", `${infraction.expiration.removedBy}`, true)
          .addField("\u200B", "\u200B", true);
      }
      infinfractionsEmbeds.push(infinfractionsEmbed);
    });

    paginationHandler(interaction, infinfractionsEmbeds);
  }
};
