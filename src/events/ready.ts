import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v9";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, Client, EmbedBuilder } from "discord.js";
import { readdirSync } from "fs";
import mongoose from "mongoose";
import { config } from "../config";
import { banHandler, muteHandler, precenceUpdater, warnHandler } from "../utils/cronTasks";

export default {
  name: "ready",
  once: true,
  async execute(client: Client) {
    console.log("1");
    // Fance console log on startup. Dont judge me on the formatting. IT WORKS.
    console.log(`\u001b[92m `);
    console.log(`    \u001b[92m╭────────────────────────────────────────╮`);
    console.log(
      `    \u001b[92m│        \x1b[37mMoti\u001b[92mMaa \x1b[37m- Discord botti         \u001b[92m│`
    );
    console.log(
      `    \u001b[92m│                                        \u001b[92m│                  \x1b[37mMade by`
    );
    console.log(
      `    \u001b[92m│          \x1b[37mVersio \x1b[92m1.0 \x1b[37m| BETA             \u001b[92m│                   \x1b[37mkassq ツ`
    );
    console.log(`    \u001b[92m╰────────────────────────────────────────╯`);
    console.log(`\u001b[92m`);
    console.log(`\u001b[37m(1/4) Kirjauduttu käyttäjänä ${client.user?.tag}.`);

    // Database connection
    const MongoURI = config.MONGODB_URI;
    try {
      await mongoose.connect(MongoURI);
      console.log("\u001b[37m(2/4) MongoDB yhdistetty...");
    } catch (err) {
      return console.log(err);
    }
    // Get all commands
    const path = `${__dirname}/../commands`;
    const commands = [];
    const commandFiles = readdirSync(path).filter(
      (file) => file.endsWith(".ts") || file.endsWith(".js")
    );
    for await (const file of commandFiles) {
      const command = (await import(`../commands/${file}`)).default;
      commands.push(command.data.toJSON());
    }

    const rest = new REST({ version: "9" }).setToken(config.BOT_TOKEN);
    await (async () => {
      // Register commands
      try {
        await rest.put(
          Routes.applicationGuildCommands(config.CLIENT_ID, config.GUILD_ID),
          {
            body: commands
          }
        );

        console.log("\u001b[37m(3/4) Applikaation komennot rekisteröity.");
      } catch (error) {
        console.error(error);
      }

      const banChannel = client.channels.cache.find(
        (channel) => channel.id === config.BAN_CHANNEL
      );

      if (banChannel?.type !== ChannelType.GuildText) {
        return console.log("Invalid ban channel type!");
      }

      if (!banChannel) {
        return console.log(
          "\u001b[37m VIRHE: Porttikielto kanavaa ei löytynyt. Täytä .env tiedoston BAN_CHANNEL oikealla kanavan ID:llä."
        );
      }
      // If channel is empty send ban embed to the channel
      if ((await banChannel.messages.fetch()).size === 0) {
        const banInfoEmbed = new EmbedBuilder()
          .setColor(config.COLORS.SUCCESS)
          .setImage("https://i.stack.imgur.com/Fzh0w.png")
          .setAuthor({
            name: "Olet saanut porttikiellon",
            iconURL: client.user?.displayAvatarURL()
          })
          .setDescription(
            // eslint-disable-next-line max-len
            `Olet saanut porttikiellon **${banChannel.guild.name}** Discord-palvelimella. Tältä kanavalta saat tietoa porttikieltosi kestosta. Sinua ei poisteta palvelimelta porttikieltosi aikana. Kun porttikieltosi vanhenee, näet jälleen kaikki kanavat.`
          )
          .setFooter({
            text: client.user?.username || "",
            iconURL: client.user?.displayAvatarURL()
          })
          .setTimestamp();
        const banButtons = new ActionRowBuilder<ButtonBuilder>().addComponents(
          // eslint-disable-next-line newline-per-chained-call
          new ButtonBuilder()
            .setCustomId("banInfo")
            .setLabel("Porttikielto")
            .setStyle(ButtonStyle.Danger)
        );

        banChannel.send({ embeds: [banInfoEmbed], components: [banButtons] });
      }

      const selfRoleChannel = client.channels.cache.find(
        (channel) => channel.id === config.ROLE_CHANNEL
      );

      if (selfRoleChannel?.type !== ChannelType.GuildText) {
        return console.log("Invalid ban channel type!");
      }

      if (!selfRoleChannel) {
        return console.log(
          "\u001b[37m VIRHE: Rooli kanavaa ei löytynyt. Täytä .env tiedoston ROLE_CHANNEL oikealla kanavan ID:llä."
        );
      }

      const roleRows = [];
      const requiredLoops = Math.ceil(config.SELF_ROLES.length / 5);
      for (let y = 0; y < requiredLoops; y++) {
        const roleButtonsRow = new ActionRowBuilder<ButtonBuilder>();

        // Make roles to loop variable.
        const rolesToLoop = config.SELF_ROLES.slice(y * 5, (y + 1) * 5);

        for (let x = 0; x < rolesToLoop.length; x++) {
          const role = rolesToLoop[x];
          roleButtonsRow.addComponents(
            // eslint-disable-next-line newline-per-chained-call
            new ButtonBuilder()
              .setCustomId(`selfRole-${role.ID}`)
              .setLabel(role.NAME)
              .setStyle(ButtonStyle.Primary)
              .setEmoji(role.EMOJI)
          );
        }

        roleRows.push(roleButtonsRow);
      }

      // If channel is empty send ban embed to the channel
      if ((await selfRoleChannel.messages?.fetch())?.size === 0) {
        const banInfoEmbed = new EmbedBuilder()
          .setColor(config.COLORS.SUCCESS)
          .setImage("https://i.stack.imgur.com/Fzh0w.png")
          .setAuthor({
            name: "Valitse roolisi",
            iconURL: client.user?.displayAvatarURL()
          })
          .setDescription(
            // eslint-disable-next-line max-len
            `Painamalla alla olevia nappeja voit valita itsellesi eri rooleja, joiden avulla näet sinulle kohdennettuja kanavia sekä saat ilmoituksia palvelimelta rooliesi mukaan. Voit poistaa itseltäsi roolin painamalla nappia uudelleen.`
          )
          .setFooter({
            text: client.user?.username || "",
            iconURL: client.user?.displayAvatarURL()
          })
          .setTimestamp();

        selfRoleChannel.send({ embeds: [banInfoEmbed], components: roleRows });
      }

      console.log("\u001b[37m(4/4) Botti on valmiina käyttöön.");

      // Cron tasks
      precenceUpdater(client);
      banHandler(client, true);
      warnHandler(client, true);
      muteHandler(client, true);
    })();
  }
};
