const { readdirSync } = require('fs');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { MessageEmbed, MessageActionRow, MessageButton, Client, TextChannel } = require('discord.js');
const mongoose = require('mongoose');
const config = require('../../config.json');
const cronTasks = require('../utils/cronTasks');

module.exports = {
    name: 'ready',
    once: true,

    /**
     * @description Called once when the bot is ready.
     * @param {Client} client
     * @returns {void}
     */
    async execute(client) {
        console.log('1');
        // Fance console log on startup. Dont judge me on the formatting. IT WORKS.
        console.log(`\u001b[92m `);
        console.log(`    \u001b[92m╭────────────────────────────────────────╮`);
        console.log(`    \u001b[92m│        \x1b[37mMoti\u001b[92mMaa \x1b[37m- Discord botti         \u001b[92m│`);
        console.log(
            `    \u001b[92m│                                        \u001b[92m│                  \x1b[37mMade by`,
        );
        console.log(
            `    \u001b[92m│          \x1b[37mVersio \x1b[92m1.0 \x1b[37m| BETA             \u001b[92m│                   \x1b[37mkassq ツ`,
        );
        console.log(`    \u001b[92m╰────────────────────────────────────────╯`);
        console.log(`\u001b[92m`);
        console.log(`\u001b[37m(1/5) Kirjauduttu käyttäjänä ${client.user.tag}.`);

        // Database connection
        const MongoURI = config.MONGODB_URI;
        try {
            await mongoose.connect(MongoURI, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
            });
            console.log('\u001b[37m(2/5) MongoDB yhdistetty...');
        } catch (err) {
            return console.log(err);
        }
        // Get all commands
        const path = `${__dirname}/../commands`;
        const commands = [];
        const commandFiles = readdirSync(path).filter(file => file.endsWith('.js'));
        for (const file of commandFiles) {
            const command = require(`../commands/${file}`);
            commands.push(command.data.toJSON());
        }

        const rest = new REST({ version: '9' }).setToken(config.BOT_TOKEN);
        (async () => {
            // Register commands
            try {
                await rest.put(Routes.applicationGuildCommands(config.CLIENT_ID, config.GUILD_ID), {
                    body: commands,
                });

                console.log('\u001b[37m(3/5) Applikaation komennot rekisteröity.');
            } catch (error) {
                console.error(error);
            }

            // Register command permissions
            const roles = [];
            const fullPermissions = [];
            const staffRoleList = config.STAFF_ROLES;

            // Roles with staff roles can use slash commands
            for (let i = 0; i < staffRoleList.length; i += 1) {
                const id = staffRoleList[i];
                roles.push({
                    id,
                    type: 'ROLE',
                    permission: true,
                });
            }

            const registeredCommands = await client.guilds.cache.get(config.GUILD_ID)?.commands.fetch();

            registeredCommands.forEach(command => {
                fullPermissions.push({
                    id: command.id,
                    permissions: roles,
                });
            });

            await client.guilds.cache.get(config.GUILD_ID)?.commands.permissions.set({ fullPermissions });
            console.log('\u001b[37m(4/5) Komentojen oikeudet rekisteröity.');

            // Handle ban channel
            /**
             * @type {TextChannel}
             */
            const banChannel = client.channels.cache.find(channel => channel.id === config.BAN_CHANNEL);
            if (!banChannel) {
                return console.log(
                    '\u001b[37m VIRHE: Porttikielto kanavaa ei löytynyt. Täytä .env tiedoston BAN_CHANNEL oikealla kanavan ID:llä.',
                );
            }
            // If channel is empty send ban embed to the channel
            if ((await banChannel.messages.fetch()).size === 0) {
                const banInfoEmbed = new MessageEmbed()
                    .setColor(config.COLORS.SUCCESS)
                    .setImage('https://i.stack.imgur.com/Fzh0w.png')
                    .setAuthor({ name: 'Olet saanut porttikiellon', iconURL: client.user.displayAvatarURL() })
                    .setDescription(
                        // eslint-disable-next-line max-len
                        `Olet saanut porttikiellon **${banChannel.guild.name}** Discord-palvelimella. Tältä kanavalta saat tietoa porttikieltosi kestosta. Sinua ei poisteta palvelimelta porttikieltosi aikana. Kun porttikieltosi vanhenee, näet jälleen kaikki kanavat.`,
                    )
                    .setFooter({ text: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTimestamp();
                const banButtons = new MessageActionRow().addComponents(
                    // eslint-disable-next-line newline-per-chained-call
                    new MessageButton().setCustomId('banInfo').setLabel('Porttikielto').setStyle('DANGER'),
                );

                banChannel.send({ embeds: [banInfoEmbed], components: [banButtons] });
            }

            // Handle ban channel
            /**
             * @type {TextChannel}
             */
            const selfRoleChannel = client.channels.cache.find(channel => channel.id === config.ROLE_CHANNEL);
            if (!selfRoleChannel) {
                return console.log(
                    '\u001b[37m VIRHE: Rooli kanavaa ei löytynyt. Täytä .env tiedoston ROLE_CHANNEL oikealla kanavan ID:llä.',
                );
            }
            // If channel is empty send ban embed to the channel
            if ((await selfRoleChannel.messages.fetch()).size === 0) {
                const banInfoEmbed = new MessageEmbed()
                    .setColor(config.COLORS.SUCCESS)
                    .setImage('https://i.stack.imgur.com/Fzh0w.png')
                    .setAuthor({ name: 'Olet saanut porttikiellon', iconURL: client.user.displayAvatarURL() })
                    .setDescription(
                        // eslint-disable-next-line max-len
                        `Olet saanut porttikiellon **${selfRoleChannel.guild.name}** Discord-palvelimella. Tältä kanavalta saat tietoa porttikieltosi kestosta. Sinua ei poisteta palvelimelta porttikieltosi aikana. Kun porttikieltosi vanhenee, näet jälleen kaikki kanavat.`,
                    )
                    .setFooter({ text: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTimestamp();
                const banButtons = new MessageActionRow().addComponents(
                    // eslint-disable-next-line newline-per-chained-call
                    new MessageButton().setCustomId('banInfo').setLabel('Porttikielto').setStyle('DANGER'),
                );

                selfRoleChannel.send({ embeds: [banInfoEmbed], components: [banButtons] });
            }

            console.log('\u001b[37m(5/5) Botti on valmiina käyttöön.');

            // Cron tasks
            cronTasks.precenceUpdater(client);
            cronTasks.banHandler(client, true);
            cronTasks.warnHandler(client, true);
            cronTasks.muteHandler(client, true);
        })();
    },
};
