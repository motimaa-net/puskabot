const { Client, GuildMember } = require('discord.js');
const config = require('../../config.json');
const Bans = require('../models/banModel');

module.exports = {
    name: 'guildMemberAdd',
    /**
     * @description Called when a member joins the guild.
     * @param {Client} client
     * @param {GuildMember} guildMember
     */
    async execute(client, guildMember) {
        const { user } = guildMember;

        // Check if user is banned on join, if so, give ban role back.
        const isBanned = await Bans.findOne({ userId: user.id, active: true });
        if (isBanned) {
            // Update user's ban.
            await Bans.findOneAndUpdate(
                { userId: user.id },
                {
                    $set: {
                        userId: user.id,
                        username: user.tag,
                    },
                },
            );

            guildMember.roles.add(config.BAN_ROLE);
        }
    },
};
