const { Client, Message, Permissions } = require('discord.js');

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
        if (process.env.DELETE_INVITES !== 'true') return;
        const inviteRegex =
            /(https:\/\/)?(www\.)?(((discord(app)?)?\.com\/invite)|((discord(app)?)?\.gg))\/(?<invite>.+)/gm;
        // Check if m.content contains an invite
        if (inviteRegex.test(m.content) && !m.member.permissions.has(Permissions.FLAGS.MANAGE_MESSAGES)) {
            // Get the invite from string
            const inviteLink = m.content.match(inviteRegex).find(invite => invite);
            const guildInvites = (await m.guild.invites.fetch()).map(invite => invite.url);
            // Check if inviteLink contains any of the guildInvites codes
            if (!guildInvites.includes(inviteLink)) {
                await m.reply({
                    content: 'Kutsulinkkien jakaminen muille palvelimille on kielletty.',
                    ephemeral: true,
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
    },
};
