import { SlashCommandBuilder } from "@discordjs/builders";
import {
  Client,
  CommandInteraction, EmbedBuilder, GuildMember
} from "discord.js";
import { config } from "../config";
import Bans from "../models/banModel";
import Mutes from "../models/muteModel";
import { epochConverter } from "../utils/timeUtils";
import { purgeMessages } from "./purge";

export default {
  data: new SlashCommandBuilder()
    .setName("mute")
    .setDescription("Anna mykistys käyttäjälle!")
    .setDefaultPermission(false)
    .addUserOption((option) =>
      option
        .setName("käyttäjä")
        .setDescription("Käyttäjä, jonka haluat mykistää?")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("syy")
        .setDescription("Miksi mykistys annetaan käyttäjälle?")
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("aika")
        .setDescription("Kuinka monta päivää mykistys kestää? Maksimi 28pv")
        .setRequired(true)
    )
    .addBooleanOption((option) =>
      option
        .setName("hiljainen")
        .setDescription("Haluatko mykistyksen olevan hiljainen (-s)?")
        .setRequired(true)
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

    const member = interaction.options.getMember("käyttäjä");
    const user = interaction.options.getUser("käyttäjä", true);
    const reason = interaction.options.getString("syy", true);
    const silent = interaction.options.getBoolean("hiljainen", true);
    const days = interaction.options.getInteger("aika", true);
    const deleteMessages = interaction.options.getString("puhdista");

    await interaction.deferReply({ ephemeral: silent });

    if (!(member instanceof GuildMember)) return;

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
      return interaction.editReply({
        embeds: [errorEmbedBase]
      });
    }

    const isBanned = await Bans.findOne({ userId: user.id, active: true });
    if (isBanned) {
      errorEmbedBase
        .setDescription(
          `Käyttäjällä **${user.tag}** on porttikielto, etkä voi mykistää porttikiellossa olevaa käyttäjää!`
        )
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

    const communicationDisabled = member?.communicationDisabledUntil;
    const isMuted = await Mutes.findOne({ userId: member.id, active: true });
    if (isMuted && communicationDisabled) {
      errorEmbedBase
        .setDescription(`Käyttäjällä **${member.user.tag}** on jo mykistys!`)
        .addFields([
          { name: "Käyttäjä", value: `${isMuted.username}`, inline: true },
          { name: "Syynä", value: `${isMuted.reason}`, inline: true },
          { name: "Rankaisija", value: `${isMuted.authorName}`, inline: true },
          {
            name: "Annettu",
            value: `<t:${epochConverter(isMuted.createdAt)}:R>`,
            inline: true
          },
          {
            name: "Kesto",
            value: isMuted.length ? `${isMuted.length} päivää` : "**Ikuinen**",
            inline: true
          },
          isMuted.expiresAt
            ? {
              name: "Loppuu",
              value: `<t:${epochConverter(isMuted.expiresAt)}:R>`,
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
      errorEmbedBase.setDescription(`Et voi antaa mykistystä botille!`);
      return interaction.editReply({
        embeds: [errorEmbedBase]
      });
    }
    if (member.id === interaction.user.id) {
      errorEmbedBase.setDescription(`Et voi antaa mykistystä itsellesi!`);
      return interaction.editReply({
        embeds: [errorEmbedBase]
      });
    }
    if (!member.moderatable) {
      errorEmbedBase.setDescription(
        `Et voi antaa mykistystä tälle käyttäjälle!`
      );
      return interaction.editReply({
        embeds: [errorEmbedBase]
      });
    }
    if (reason.length < 4 || reason.length > 200) {
      errorEmbedBase.setDescription(
        `Mykistyksen syyn täytyy olla 4-200 merkkiä pitkä!`
      );
      return interaction.editReply({
        embeds: [errorEmbedBase]
      });
    }
    if (days < 1 || days > 28) {
      errorEmbedBase.setDescription(
        `Mykistyksen keston täytyy olla 1-28 päivää! Mikäli haluttu kesto on suurempi, harkitse porttikiellon antamista.`
      );
      return interaction.editReply({
        embeds: [errorEmbedBase]
      });
    }

    if (deleteMessages)
      await purgeMessages(interaction, member, parseInt(deleteMessages));

    // Initialize mute expiry date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    member.disableCommunicationUntil(expiresAt, reason);

    const newMute = new Mutes({
      userId: member.id,
      username: `${member.user.tag}`,

      authorId: interaction.user.id,
      authorName: `${interaction.user.tag}`,

      reason,
      length: days,
      expiresAt: expiresAt
    });
    await newMute.save();

    const muteEmbed = new EmbedBuilder()
      .setColor(config.COLORS.SUCCESS)
      .setImage("https://i.stack.imgur.com/Fzh0w.png")
      .setAuthor({
        name: "Mykistys myönnetty",
        iconURL: client.user?.displayAvatarURL()
      })
      .setDescription(
        `Käyttäjälle **${member.user.tag}** on myönnetty mykistys!`
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
        {
          name: "Loppuu",
          value: `<t:${epochConverter(expiresAt)}:R>`,
          inline: true
        }
      ])
      .setFooter({
        text: interaction.user.username,
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTimestamp();

    interaction.editReply({ embeds: [muteEmbed] });
  }
};
