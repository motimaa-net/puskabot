import { SlashCommandBuilder } from "@discordjs/builders";
import {
  Client,
  CommandInteraction,
  GuildMember,
  MessageEmbed
} from "discord.js";
import { config } from "../config";
import Mutes from "../models/muteModel";
import { epochConverter } from "../utils/timeUtils";

export default {
  data: new SlashCommandBuilder()
    .setName("unmute")
    .setDescription("Poista käyttäjältä mykistys!")
    .setDefaultPermission(false)
    .addUserOption((option) =>
      option
        .setName("käyttäjä")
        .setDescription("Käyttäjä jonka mykistyksen haluat poistaa?")
        .setRequired(true)
    )

    .addBooleanOption((option) =>
      option
        .setName("hiljainen")
        .setDescription("Haluatko mykistyksen poiston olevan hiljainen (-s)?")
        .setRequired(true)
    ),

  async execute(client: Client, interaction: CommandInteraction) {
    const member = interaction.options.getMember("käyttäjä", true);
    const user = interaction.options.getUser("käyttäjä", true);
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

    const isMuted = await Mutes.findOne({ userId: user.id, active: true });
    if (!isMuted) {
      errorEmbedBase.setDescription(
        `Käyttäjällä **${user.tag}** ei ole voimassa olevaa mykistystä!`
      );
      return interaction.reply({ embeds: [errorEmbedBase], ephemeral: true });
    }

    member.disableCommunicationUntil(null, "");

    await Mutes.findOneAndUpdate(
      { userId: member.id, active: true },
      {
        $set: {
          active: false,
          removedType: "removed",
          removedAt: new Date(),
          removedBy: interaction.user.tag
        }
      }
    );

    const unmuteEmbed = new MessageEmbed()
      .setColor(config.COLORS.SUCCESS)
      .setImage("https://i.stack.imgur.com/Fzh0w.png")
      .setAuthor({
        name: "Mykistys poistettu",
        iconURL: client.user?.displayAvatarURL()
      })
      .setDescription(`Käyttäjän **${member.user.tag}** mykistys on poistettu!`)
      .addFields([
        { name: "Käyttäjä", value: `${member.user.tag}`, inline: true },
        { name: "Syynä", value: `${isMuted.reason}`, inline: true },
        {
          name: "Rankaisija",
          value: `${isMuted.author.username}`,
          inline: true
        },
        {
          name: "Kesto",
          value: isMuted.expiration.length
            ? `${isMuted.expiration.length} päivää`
            : "**Ikuinen**",
          inline: true
        },
        {
          name: "Poistettu",
          value: `<t:${epochConverter(new Date())}:R>`,
          inline: true
        },
        { name: "\u200B", value: `\u200B`, inline: true }
      ])
      .setFooter({
        text: interaction.user.username,
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTimestamp();

    interaction.reply({ embeds: [unmuteEmbed], ephemeral: silent });
  }
};
