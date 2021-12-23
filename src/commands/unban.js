const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed, Client, Interaction, GuildMember } = require('discord.js');
const Bans = require('../models/banModel');
const timeUtils = require('../utils/timeUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Poista käyttäjältä porttikielto!')
        .setDefaultPermission(false)
        .addUserOption(option =>
            option.setName('käyttäjä').setDescription('Käyttäjä jonka porttikiellon haluat poistaa?').setRequired(true),
        )

        .addBooleanOption(option =>
            option
                .setName('hiljainen')
                .setDescription('Haluatko porttikiellon poiston olevan hiljainen (-s)?')
                .setRequired(true),
        ),

    /**
     * @description Unban command
     * @param {Client} client
     * @param {Interaction} interaction
     * @returns {void}
     */
    async execute(client, interaction) {
        /**
         * @type {GuildMember}
         */
        const member = interaction.options.getMember('käyttäjä');

        /**
         * @type {boolean}
         */
        const silent = interaction.options.getBoolean('hiljainen');

        const errorEmbedBase = new MessageEmbed()
            .setColor(process.env.ERROR_COLOR)
            .setImage('https://i.stack.imgur.com/Fzh0w.png')
            .setAuthor({ name: 'Tapahtui virhe', iconURL: client.user.displayAvatarURL() })
            .setFooter(interaction.user.username, interaction.user.displayAvatarURL())
            .setTimestamp();

        const isBanned = await Bans.findOne({ userId: member.id, active: true });
        if (!isBanned) {
            errorEmbedBase.setDescription(`Käyttäjällä **${member.user.tag}** ei ole voimassa olevaa porttikieltoa!`);
            return interaction.reply({ embeds: [errorEmbedBase], ephemeral: true });
        }

        member.roles.set(isBanned.roles);

        await Bans.findOneAndUpdate(
            { userId: member.id, active: true },
            {
                $set: {
                    active: false,
                    unbannedType: 'manual',
                    unbannedAt: new Date(),
                    unbannedBy: interaction.user.tag,
                },
            },
        );

        const unbanEmbed = new MessageEmbed()
            .setColor(process.env.SUCCESS_COLOR)
            .setImage('https://i.stack.imgur.com/Fzh0w.png')
            .setAuthor({ name: 'Porttikielto poistettu', iconURL: client.user.displayAvatarURL() })
            .setDescription(`Käyttäjän **${member.user.tag}** porttikielto on poistettu!`)
            .addFields([
                { name: 'Käyttäjä', value: `${member.user.tag}`, inline: true },
                { name: 'Syynä', value: `${isBanned.reason}`, inline: true },
                {
                    name: 'Rankaisija',
                    value: `${isBanned.authorName}`,
                    inline: true,
                },
                {
                    name: 'Kesto',
                    value: isBanned.length ? `${isBanned.length} päivää` : '**Ikuinen**',
                    inline: true,
                },
                { name: 'Poistettu', value: `<t:${timeUtils.epochConverter(new Date())}:R>`, inline: true },
                { name: '\u200B', value: `\u200B`, inline: true },
            ])
            .setFooter(interaction.user.username, interaction.user.displayAvatarURL())
            .setTimestamp();

        interaction.reply({ embeds: [unbanEmbed], ephemeral: silent });
    },
};
