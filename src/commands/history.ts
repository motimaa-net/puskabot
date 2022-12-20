import { SlashCommandBuilder } from "@discordjs/builders";
import { Client, CommandInteraction, EmbedBuilder } from "discord.js";
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

    if (!interaction.isChatInputCommand()) return;

    const member = interaction.options.getMember("käyttäjä");
    const user = interaction.options.getUser("käyttäjä");
    const silent = interaction.options.getBoolean("hiljainen", true);

    await interaction.deferReply({ ephemeral: silent ?? false });

    const errorEmbedBase = new EmbedBuilder()
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
    const activeBans = totalBans.filter((ban) => ban.active);
    const activeWarns = totalWarns.filter((warn) => warn.active);
    const activeMutes = totalMutes.filter((mute) => mute.active);

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
    combinedInfractions.sort((a, b) => b.createdAt - a.createdAt);

    const historyEmbed = new EmbedBuilder()
      .setColor(config.COLORS.SUCCESS)
      .setImage("https://i.stack.imgur.com/Fzh0w.png")
      .setAuthor({
        name: `Rikehistoria tiedot ${combinedInfractions.length > 0
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
          `\`\`\`yaml\n${x + 1}: ${warn.authorName} varoitti syystä "${warn.reason
          }" # (${`${daysAgo(warn.createdAt)}`})\`\`\``
        );
      }
      historyEmbed.addFields([
        {
          name: "Aktiiviset varoitukset",
          value: `${activeWarnsFormatted.join("")}`,
          inline: false
        }
      ]);
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
        value: `${activeMutes.length > 0
          ? activeMutes[0]?.length
            ? `Kyllä (_${activeMutes[0].length} päivää_)`
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
        value: `${activeBans.length > 0
          ? activeBans[0]?.length
            ? `Kyllä (_${activeBans[0].length} päivää_)`
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
          value: activeBans[0].expiresAt
            ? `<t:${epochConverter(activeBans[0].expiresAt)}:R>`
            : "__Ikuinen__",
          inline: true
        },
        {
          name: "Porttikiellon antaja",
          value: `${activeBans[0].authorName}`,
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
      const infinfractionsEmbed = new EmbedBuilder()
        .setColor(
          infraction.active ? config.COLORS.SUCCESS : config.COLORS.WARNING
        )
        .setImage("https://i.stack.imgur.com/Fzh0w.png")
        .setAuthor({
          name: `${infraction.type.charAt(0).toUpperCase() +
            infraction.type.substring(1)
            } (${index + 2}/${combinedInfractions.length + 1})`,
          iconURL: client.user?.displayAvatarURL()
        })
        .setDescription(
          `Käyttäjälle **${infraction.username}** on myönnetty ${infraction.type}!`
        )
        .setFooter({
          text: interaction.user.username,
          iconURL: interaction.user.displayAvatarURL()
        })
        .setTimestamp()
        .addFields([
          { name: "Käyttäjä", value: `${infraction.username}`, inline: true },
          { name: "Syynä", value: `${infraction.reason}`, inline: true },
          {
            name: "Rankaisija",
            value: `${infraction.authorName}`,
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
              value: infraction.length
                ? `${infraction.length} päivää`
                : "**Ikuinen**",
              inline: true
            }
            : {
              name: "Kesto",
              value: `${config.WARN_EXPIRES} päivää`,
              inline: true
            },
          infraction.length && infraction.removedType !== "manual"
            ? {
              name: "Vanhenee",
              value: `<t:${epochConverter(infraction.expiresAt)}:R>`,
              inline: true
            }
            : { name: "\u200B", value: `\u200B`, inline: true }
        ]);
      if (infraction.removedType === "manual") {
        infinfractionsEmbed
          .addFields([
            {
              name: "Poistettu manuaalisesti",
              value: `<t:${epochConverter(infraction.removedAt)}:R>`,
              inline: true,
            },
            {
              name: "Poistaja",
              value: `${infraction.removedBy}`,
              inline: true
            },
            {
              name: "\u200B",
              value: "\u200b",
              inline: true
            }

          ])
      }
      infinfractionsEmbeds.push(infinfractionsEmbed);
    });

    paginationHandler(interaction, infinfractionsEmbeds);
  }
};
