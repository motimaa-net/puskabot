import {
  Client,
  DiscordAPIError,
  GuildMember,
  Interaction,
  MessageEmbed,
  Permissions
} from "discord.js";
import { config } from "../config";
import Bans from "../models/banModel";
import { banHandler, muteHandler, warnHandler } from "../utils/cronTasks";
import { logger } from "../utils/logger";
import { epochConverter } from "../utils/timeUtils";

export default {
  name: "interactionCreate",
  async execute(client: Client, interaction: Interaction) {
    if (interaction.isCommand()) {
      if (
        !(interaction?.member as GuildMember)?.permissions?.has(
          Permissions.FLAGS.MANAGE_MESSAGES
        )
      ) {
        return;
      }

      const command = client.commands.get(interaction.commandName).default;
      if (!command) return;

      try {
        const banPromise = banHandler(client, false);
        const cronPromise = warnHandler(client, false);
        const mutePromise = muteHandler(client, false);
        await Promise.all([banPromise, cronPromise, mutePromise]);

        await command.execute(client, interaction);
        logger(interaction);
        return;
      } catch (error) {
        console.error(error);
        await interaction.reply({
          content: "Komentoa suorittaessa ilmeni virhe!",
          ephemeral: true
        });
      }
    }

    // Handle buttons
    if (interaction.isButton()) {
      if (interaction.customId === "banInfo") {
        const banDetails = await Bans.findOne({
          userId: interaction.user.id,
          active: true
        });
        if (!banDetails) {
          return interaction.reply({
            content: "Sinulla ei ole porttikieltoa!",
            ephemeral: true
          });
        }
        const banInfoEmbed = new MessageEmbed()
          .setColor(config.COLORS.SUCCESS)
          .setImage("https://i.stack.imgur.com/Fzh0w.png")
          .setAuthor({
            name: "Porttikielto myönnetty",
            iconURL: client.user?.displayAvatarURL()
          })
          .setDescription(`Sinulle on myönnetty porttikielto!`)
          .addFields([
            {
              name: "Käyttäjä",
              value: `${interaction.user.tag}`,
              inline: true
            },
            { name: "Syynä", value: `${banDetails.reason}`, inline: true },
            {
              name: "Rankaisija",
              value: `${banDetails.author.username}`,
              inline: true
            },
            {
              name: "Annettu",
              value: `<t:${epochConverter(banDetails.createdAt as Date)}:R>`,
              inline: true
            },
            {
              name: "Kesto",
              value: banDetails.expiration.length
                ? `${banDetails.expiration.length} päivää`
                : "**Ikuinen**",
              inline: true
            },
            banDetails.expiration.length
              ? {
                  name: "Loppuu",
                  value: `<t:${epochConverter(
                    banDetails.expiration.expiresAt as Date
                  )}:R>`,
                  inline: true
                }
              : { name: "\u200B", value: `\u200B`, inline: true }
          ])
          .setFooter({
            text: interaction.user.username,
            iconURL: interaction.user.displayAvatarURL()
          })
          .setTimestamp();
        return interaction.reply({ embeds: [banInfoEmbed], ephemeral: true });
      } else if (interaction.customId.startsWith("selfRole-")) {
        await interaction.deferReply({ ephemeral: true });
        const roleId = interaction.customId.split("-")[1];
        const roleToGive = interaction.guild?.roles?.cache.find(
          (role) => role.id === roleId
        );
        if (!roleToGive) {
          return interaction.editReply({
            content:
              "Roolia ei löytynyt! Ilmoita tästä palvelimen ylläpitäjille."
          });
        }
        try {
          if (!(interaction?.member instanceof GuildMember)) return;

          if (
            !(interaction?.member as GuildMember)?.roles?.cache.has(
              roleToGive.id
            )
          ) {
            await (interaction?.member as GuildMember)?.roles.add(roleToGive);
            return interaction.editReply({
              content: `Olet lisännyt itsellesi roolin **${roleToGive.name}**!`
            });
          } else {
            interaction.member.roles.remove(roleToGive.id);
            return interaction.editReply({
              content: `Poistit itseltäsi roolin **${roleToGive.name}**!`
            });
          }
        } catch (error) {
          if ((error as DiscordAPIError)?.code === 10062) return;
          console.error(error);
          return interaction.editReply({
            content: "Tapahtui virhe! Ilmoita tästä palvelimen ylläpitäjille."
          });
        }
      }
    }
  }
};
