const { Client, Message, Permissions } = require('discord.js');

const usersMap = new Map();
const LIMIT = 7;
const DIFF = 5000;
const TIME = 30000;

module.exports = {
    name: 'messageCreate',
    once: false,

    /**
     * @description Called once when the bot is ready.
     * @param {Client} client
     * @param {Message} m
     * @returns {void}
     */
    async execute(client, m) {
        if (m.author.bot) return;
        if (m.member.permissions.has(Permissions.FLAGS.MANAGE_MESSAGES)) return;

        if (process.env.DELETE_INVITES === 'true') {
            const inviteRegex =
                /(https:\/\/)?(www\.)?(((discord(app)?)?\.com\/invite)|((discord(app)?)?\.gg))\/(?<invite>.+)/gm;

            if (inviteRegex.test(m.content)) {
                // Get the invite from string
                const inviteLink = m.content.match(inviteRegex).find(invite => invite);
                const guildInvites = (await m.guild.invites.fetch()).map(invite => invite.url);
                // Check if inviteLink contains any of the guildInvites codes
                if (!guildInvites.includes(inviteLink)) {
                    await m.reply({
                        content: `Hei <@${m.member.user.id}>! Kutsulinkkien jakaminen muille palvelimille on kielletty.`,
                    });

                    m.createdTimestamp += 30000;

                    await m.member.disableCommunicationUntil(
                        m.createdTimestamp,
                        'Kutsulinkkien jakaminen muille palvelimille on kielletty.',
                    );

                    m.delete().catch(e => {
                        if (e.code) return;
                        console.log(e);
                    });
                }
            }
        }
        if (process.env.SPAM_HANDLER === 'true') {
            if (usersMap.has(m.author.id)) {
                const userData = usersMap.get(m.author.id);
                const { lastMessage, timer } = userData;
                const difference = m.createdTimestamp - lastMessage.createdTimestamp;
                let msgCount = userData.msgCount;
                if (difference > DIFF) {
                    clearTimeout(timer);
                    userData.msgCount = 1;
                    userData.lastMessage = m;
                    userData.timer = setTimeout(() => {
                        usersMap.delete(m.author.id);
                    }, TIME);
                    usersMap.set(m.author.id, userData);
                } else {
                    ++msgCount;
                    if (parseInt(msgCount) === LIMIT) {
                        m.reply({
                            content:
                                'Kappas kummaa, nalkkiin jäit senkin pikkurikollinen! Spammiviestien lähettäminen ei ole sallittua.',
                            ephemeral: true,
                        });
                        m.createdTimestamp += 3000;
                        await m.member.disableCommunicationUntil(
                            m.createdTimestamp,
                            'Kappas kummaa, nalkkiin jäit senkin pikkurikollinen! Spammiviestien lähettäminen ei ole sallittua.',
                        );
                        m.channel.bulkDelete(LIMIT);
                    } else {
                        userData.msgCount = msgCount;
                        usersMap.set(m.author.id, userData);
                    }
                }
            } else {
                let fn = setTimeout(() => {
                    usersMap.delete(m.author.id);
                }, TIME);
                usersMap.set(m.author.id, {
                    msgCount: 1,
                    lastMessage: m,
                    timer: fn,
                });
            }
        }
        // TODO: Add suggestion channel to config (requires pterodactyl egg to be edited ZzZZz)
        if(m.channel.id === "643450708540129290") {
            await m.react('👍');
            await m.react('👎');
        }
    },
};
