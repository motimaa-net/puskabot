import { SlashCommandBuilder } from "@discordjs/builders";
import {
  Client,
  CommandInteraction,
  GuildMember,
  MessageEmbed
} from "discord.js";
import { config } from "../config";
import Bans from "../models/banModel";
import { epochConverter } from "../utils/timeUtils";

export default {
  data: new SlashCommandBuilder()
    .setName("unban")
    .setDescription("Poista käyttäjältä porttikielto!")
    .setDefaultPermission(false)
    .addUserOption((option) =>
      option
        .setName("käyttäjä")
        .setDescription("Käyttäjä jonka porttikiellon haluat poistaa?")
        .setRequired(true)
    )

    .addBooleanOption((option) =>
      option
        .setName("hiljainen")
        .setDescription("Haluatko porttikiellon poiston olevan hiljainen (-s)?")
        .setRequired(true)
    ),

  async execute(client: Client, interaction: CommandInteraction) {
    const user = interaction.options.getUser("käyttäjä", true);
    const member = interaction.options.getMember("käyttäjä", true);
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
        iconURL: interaction.user?.displayAvatarURL()
      })
      .setTimestamp();

    if (!user?.id) {
      errorEmbedBase.setDescription(
        `Kyseistä käyttäjää ei löytynyt! Käyttäjä on todennäköisesti poistunut palvelimelta!`
      );
      return interaction.reply({ embeds: [errorEmbedBase], ephemeral: true });
    }

    const isBanned = await Bans.findOne({
      "user.id": user.id,
      "expiration.active": true
    });
    if (!isBanned) {
      errorEmbedBase.setDescription(
        `Käyttäjällä **${user.tag}** ei ole voimassa olevaa porttikieltoa!`
      );
      return interaction.reply({ embeds: [errorEmbedBase], ephemeral: true });
    }

    member.roles.set(isBanned.roles);

    await Bans.findOneAndUpdate(
      { "user.id": member.id, "expiration.active": true },
      {
        $set: {
          active: false,
          removedType: "removed",
          removedAt: new Date(),
          removedBy: interaction.user.tag
        }
      }
    );

    const unbanEmbed = new MessageEmbed()
      .setColor(config.COLORS.SUCCESS)
      .setImage("https://i.stack.imgur.com/Fzh0w.png")
      .setAuthor({
        name: "Porttikielto poistettu",
        iconURL: client.user?.displayAvatarURL()
      })
      .setDescription(
        `Käyttäjän **${member.user.tag}** porttikielto on poistettu!`
      )
      .addFields([
        { name: "Käyttäjä", value: `${member.user.tag}`, inline: true },
        { name: "Syynä", value: `${isBanned.reason}`, inline: true },
        {
          name: "Rankaisija",
          value: `${isBanned.author.username}`,
          inline: true
        },
        {
          name: "Kesto",
          value: isBanned.expiration.length
            ? `${isBanned.expiration.length} päivää`
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

    interaction.reply({ embeds: [unbanEmbed], ephemeral: silent });
  }
};
