import { SlashCommandBuilder } from "@discordjs/builders";
import {
  Client,
  CommandInteraction,
  GuildMember,
  MessageEmbed
} from "discord.js";
import { config } from "../config";

export const purgeMessages = async (
  interaction: CommandInteraction,
  member: GuildMember,
  days: number
): Promise<number | null> => {
  const guildTextChannels = interaction?.guild?.channels.cache.filter(
    (c) => c.type === "GUILD_TEXT"
  );

  if (!guildTextChannels) return null;

  const channels = Array.from(guildTextChannels);

  let deleted = 0;
  let iteration = 0;
  for await (const c of channels) {
    const channel = c[1];
    if (channel.type !== "GUILD_TEXT") continue;
    await channel.messages.fetch({ limit: 100 }).then(async (messages) => {
      const messagesToDelete: string[] = [];
      const date = new Date();
      date.setDate(date.getDate() - days);

      await messages
        .filter((m) => m.author.id === member.id)
        .forEach((m) => {
          // Delete all messages that are older than the given amount of days

          const messageDate = new Date(m.createdAt);

          if (messageDate > date) {
            if (!m.deletable) return;
            messagesToDelete.push(m.id);
          }
        });

      if (messagesToDelete.length > 0) {
        deleted += messagesToDelete.length;
        await channel.bulkDelete(messagesToDelete, true);
      }
    });
    iteration++;
  }

  return deleted;
};

export default {
  purgeMessages,
  data: new SlashCommandBuilder()
    .setName("purge")
    .setDescription("Poista viestejä kanavalta!")
    .setDefaultPermission(false)

    .addSubcommand((subcommand) =>
      subcommand
        .setName("user")
        .setDescription("Poista tietyn käyttäjän viestejä kanavalta!")
        .addUserOption((option) =>
          option
            .setName("käyttäjä")
            .setDescription("Käyttäjä, jonka viestejä haluat poistaa!")
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("aika")
            .setDescription("Aikajana, jolta käyttäjän viestejä poistetaan!")
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
            .setRequired(true)
        )
        .addBooleanOption((option) =>
          option
            .setName("hiljainen")
            .setDescription("Haluatko viestien poiston olevan hiljainen (-s)?")
            .setRequired(true)
        )
    ),

  async execute(client: Client, interaction: CommandInteraction) {
    const subCommand = interaction.options.getSubcommand();

    const member = interaction.options.getMember("käyttäjä", true);
    const days = interaction.options.getString("aika", true);
    const silent = interaction.options.getBoolean("hiljainen", true);

    if (!(member instanceof GuildMember)) return;

    if (subCommand === "user") {
      const deleteCount = await purgeMessages(
        interaction,
        member,
        parseInt(days)
      );

      if (deleteCount && deleteCount > 0) {
        const purgeEmbed = new MessageEmbed()
          .setColor(config.COLORS.SUCCESS)
          .setImage("https://i.stack.imgur.com/Fzh0w.png")
          .setAuthor({
            name: "Viestit poistettu onnistuneesti",
            iconURL: client.user?.displayAvatarURL()
          })
          .setDescription(
            // eslint-disable-next-line max-len
            `Käyttäjän **${member.user.username}** viestit ajalta ${days} päivä(ä) poistettu onnistuneesti.`
          )
          .addField("Viestejä poistettu", `${deleteCount}kpl`)
          .setFooter({
            text: client.user?.username || "",
            iconURL: client.user?.displayAvatarURL()
          })
          .setTimestamp();
        return interaction.reply({ embeds: [purgeEmbed], ephemeral: silent });
      } else {
        const errorEmbed = new MessageEmbed()
          .setColor(config.COLORS.ERROR)
          .setImage("https://i.stack.imgur.com/Fzh0w.png")
          .setAuthor({
            name: "Tapahtui virhe",
            iconURL: client.user?.displayAvatarURL()
          })
          .setDescription(
            // eslint-disable-next-line max-len
            `Käyttäjältä ei löytynyt poistettavia viestejä annetulla aikajanalla.`
          )
          .setFooter({
            text: client.user?.username || "",
            iconURL: client.user?.displayAvatarURL()
          })
          .setTimestamp();
        return interaction.reply({ embeds: [errorEmbed], ephemeral: silent });
      }
    }
  }
};
