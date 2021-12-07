const { readdirSync } = require('fs');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const Discord = require('discord.js');
const mongoose = require('mongoose');
const cronTasks = require('../utils/cronTasks');

module.exports = {
    name: 'ready',
    once: true,

    /**
     * @description Called once when the bot is ready.
     * @param {Discord.Client} client
     * @returns {void}
     */
    async execute(client) {
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
        const MongoURI = process.env.MONGODB_URI;
        try {
            await mongoose.connect(MongoURI, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
            });
            console.log('\u001b[37m(2/5) MongoDB yhdistetty...');
        } catch (err) {
            return console.log(err);
        }

        // Call cron tasks
        cronTasks.precenceUpdater(client);
        cronTasks.banHandler(client);
        cronTasks.warnHandler(client);

        // Get all commands
        const path = `${__dirname}/../commands`;
        const commands = [];
        const commandFiles = readdirSync(path).filter(file => file.endsWith('.js'));
        for (const file of commandFiles) {
            const command = require(`../commands/${file}`);
            commands.push(command.data.toJSON());
        }

        const rest = new REST({ version: '9' }).setToken(process.env.BOT_TOKEN);
        (async () => {
            // Register commands
            try {
                await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), {
                    body: commands,
                });

                console.log('\u001b[37m(3/5) Applikaation komennot rekisteröity.');
            } catch (error) {
                console.error(error);
            }

            // Register command permissions
            const users = [];
            const fullPermissions = [];
            const staffIdList = [];

            // Users with MANAGE_MESSAGES permission are able to use all commannds
            (await client.guilds.cache.get(process.env.GUILD_ID).members.fetch())
                .filter(member => member.permissions.has('MANAGE_MESSAGES'))
                .forEach(member => {
                    staffIdList.push(member.id);
                });

            for (let i = 0; i < staffIdList.length; i += 1) {
                const id = staffIdList[i];
                users.push({
                    id,
                    type: 'USER',
                    permission: true,
                });
            }

            const registeredCommands = await client.guilds.cache.get(process.env.GUILD_ID)?.commands.fetch();

            registeredCommands.forEach(command => {
                fullPermissions.push({
                    id: command.id,
                    permissions: users,
                });
            });

            await client.guilds.cache.get(process.env.GUILD_ID)?.commands.permissions.set({ fullPermissions });
            console.log('\u001b[37m(4/5) Komentojen oikeudet rekisteröity.');
            console.log('\u001b[37m(5/5) Botti on valmiina käyttöön.');
        })();
    },
};
