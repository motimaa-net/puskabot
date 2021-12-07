const axios = require('axios');
const Discord = require('discord.js');
const cron = require('node-cron');
const Bans = require('../models/banModel');
const Warns = require('../models/warnModel');

const cronTasks = {
    /**
     * @description - Handles cron job for the bans.
     * @param {Discord.Client} client
     */
    banHandler: client => {
        const removeExpiredBans = async () => {
            const activeBans = await Bans.find({ active: true });
            const expiredBans = [];

            for (let x = 0; x < activeBans.length; x++) {
                const banToCheck = activeBans[x];
                if (banToCheck.expiresAt && banToCheck.expiresAt < Date.now()) {
                    expiredBans.push(banToCheck._id);

                    // Fetch the banned user and give old roles back if user is still on server + send message to user that ban has expired
                    client.guilds.cache
                        .get(process.env.GUILD_ID)
                        .members.fetch(banToCheck.userId)
                        .then(member => {
                            if (member) {
                                member.roles.set(banToCheck.roles);
                                member
                                    .send({
                                        content: `Porttikieltosi on päättynyt!`,
                                    })
                                    .catch(e => {
                                        if (e.code === 50007) return;
                                        console.log(e);
                                    });
                            }
                        });
                }
            }

            // Update all expired bans to inactive
            await Bans.updateMany({ _id: { $in: expiredBans } }, { $set: { active: false } });

            if (expiredBans.length > 0) {
                console.log(`> ${expiredBans.length} porttikieltoa vanheni ja käyttäjät on vapaita jälleen.`);
            }
        };

        // Cron task for removing expired bans
        try {
            // Run after startup
            removeExpiredBans();

            // Runs every hour
            cron.schedule('0 * * * *', () => {
                removeExpiredBans();
            });
        } catch (error) {
            console.log(error);
        }
    },

    /**
     * @description - Handles cron job for the warns.
     */
    warnHandler: () => {
        const removeExpiredWarns = async () => {
            const activeWarnings = await Warns.find({ active: true });
            const expiredWarns = [];
            for (let x = 0; x < activeWarnings.length; x++) {
                const warnToCheck = activeWarnings[x];
                if (warnToCheck.expiresAt && warnToCheck.expiresAt < Date.now()) {
                    expiredWarns.push(warnToCheck._id);
                }
            }
            await Warns.updateMany({ _id: { $in: expiredWarns } }, { $set: { active: false } });
            if (expiredWarns.length > 0) {
                console.log(`> ${expiredWarns.length} vanhentunutta varoitusta poistettu.`);
            }
        };
        try {
            // Run after startup
            removeExpiredWarns();

            // Runs every hour
            cron.schedule('0 * * * *', () => {
                removeExpiredWarns();
            });
        } catch (error) {
            console.log(error);
        }
    },

    /**
     * @description - Updates motimaa.net playercount to bot's precense.
     * @param {Discord.Client} client
     */
    precenceUpdater: client => {
        const updatePrecense = async () => {
            const playerCount = (await axios.get('https://mcapi.us/server/status?ip=motimaa.net&port=25565')).data
                .players.now;
            return client.user.setActivity(`${playerCount} pelaajaa`, {
                type: 'WATCHING',
            });
        };
        try {
            // Run after startup
            updatePrecense();

            // Runs every 15minutes
            cron.schedule('*/15 * * * *', () => {
                updatePrecense();
            });
        } catch (error) {
            console.log(error);
        }
    },
};

module.exports = cronTasks;
