const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed, Permissions, Client, Interaction, GuildMember } = require('discord.js');
const Bans = require('../models/banModel');
const Mutes = require('../models/muteModel');
const timeUtils = require('../utils/timeUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Anna mykistys käyttäjälle!')
        .setDefaultPermission(false)
        .addUserOption(option =>
            option.setName('käyttäjä').setDescription('Käyttäjä, jonka haluat mykistää?').setRequired(true),
        )
        .addStringOption(option =>
            option.setName('syy').setDescription('Miksi mykistys annetaan käyttäjälle?').setRequired(true),
        )
        .addBooleanOption(option =>
            option.setName('hiljainen').setDescription('Haluatko mykistyksen olevan hiljainen (-s)?').setRequired(true),
        )
        .addIntegerOption(option =>
            option.setName('aika').setDescription('Kuinka monta päivää mykistys kestää?').setRequired(false),
        ),

    /**
     * @description Mute command
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
         * @type {number}
         */
        const days = interaction.options.getInteger('aika');

        /**
         * @type {string}
         */
        const reason = interaction.options.getString('syy');

        /**
         * @type {boolean}
         */
        const silent = interaction.options.getBoolean('hiljainen');

        const errorEmbedBase = new MessageEmbed()
            .setColor(process.env.ERROR_COLOR)
            .setImage('https://i.stack.imgur.com/Fzh0w.png')
            .setAuthor('Tapahtui virhe', client.user.displayAvatarURL())
            .setFooter(interaction.user.username, interaction.user.displayAvatarURL())
            .setTimestamp();

        const isBanned = await Bans.findOne({ userId: member.id, active: true });
        if (isBanned) {
            errorEmbedBase
                .setDescription(
                    `Käyttäjällä **${member.user.tag}** on porttikielto, etkä voi mykistää porttikiellossa olevaa käyttäjää!`,
                )
                .addFields([
                    { name: 'Käyttäjä', value: `${isBanned.username}`, inline: true },
                    { name: 'Syynä', value: `${isBanned.reason}`, inline: true },
                    { name: 'Rankaisija', value: `${isBanned.authorName}`, inline: true },
                    { name: 'Annettu', value: `<t:${timeUtils.epochConverter(isBanned.createdAt)}:R>`, inline: true },
                    {
                        name: 'Kesto',
                        value: isBanned.length ? `${isBanned.length} päivää` : '**Ikuinen**',
                        inline: true,
                    },
                    isBanned.expiresAt
                        ? {
                              name: 'Loppuu',
                              value: `<t:${timeUtils.epochConverter(isBanned.expiresAt)}:R>`,
                              inline: true,
                          }
                        : { name: '\u200B', value: `\u200B`, inline: true },
                ]);
            return interaction.reply({ embeds: [errorEmbedBase], ephemeral: true });
        }

        const isMuted = await Mutes.findOne({ userId: member.id, active: true });
        if (isMuted) {
            errorEmbedBase.setDescription(`Käyttäjällä **${member.user.tag}** on jo mykistys!`).addFields([
                { name: 'Käyttäjä', value: `${isMuted.username}`, inline: true },
                { name: 'Syynä', value: `${isMuted.reason}`, inline: true },
                { name: 'Rankaisija', value: `${isMuted.authorName}`, inline: true },
                { name: 'Annettu', value: `<t:${timeUtils.epochConverter(isMuted.createdAt)}:R>`, inline: true },
                {
                    name: 'Kesto',
                    value: isMuted.length ? `${isMuted.length} päivää` : '**Ikuinen**',
                    inline: true,
                },
                isMuted.expiresAt
                    ? { name: 'Loppuu', value: `<t:${timeUtils.epochConverter(isMuted.expiresAt)}:R>`, inline: true }
                    : { name: '\u200B', value: `\u200B`, inline: true },
            ]);
            return interaction.reply({ embeds: [errorEmbedBase], ephemeral: true });
        }

        // Validation
        if (member.bot) {
            errorEmbedBase.setDescription(`Et voi antaa mykistystä botille!`);
            return interaction.reply({ embeds: [errorEmbedBase], ephemeral: true });
        }
        if (member.id === interaction.user.id) {
            errorEmbedBase.setDescription(`Et voi antaa mykistystä itsellesi!`);
            return interaction.reply({ embeds: [errorEmbedBase], ephemeral: true });
        }
        if (member.permissions.has(Permissions.FLAGS.ADMINISTRATOR)) {
            errorEmbedBase.setDescription(`Et voi antaa mykistystä ylläpitäjälle!`);
            return interaction.reply({ embeds: [errorEmbedBase], ephemeral: true });
        }
        if (reason.length < 4 || reason.length > 200) {
            errorEmbedBase.setDescription(`Mykistyksen syyn täytyy olla 4-200 merkkiä pitkä!`);
            return interaction.reply({ embeds: [errorEmbedBase], ephemeral: true });
        }
        if (days && (days < 1 || days > 365)) {
            errorEmbedBase.setDescription(
                `Mykistyksen keston täytyy olla 1-365 päivää! Voit myös antaa ikuisen mykistyksen jättämällä aika-arvon huomioimatta.`,
            );
            return interaction.reply({ embeds: [errorEmbedBase], ephemeral: true });
        }

        // Save user roles before mute
        const userRoles = [];
        await member.roles.cache
            .sort((a, b) => b.position - a.position)
            .map(r => r)
            .forEach(role => {
                if (role.name !== '@everyone') {
                    userRoles.push(role.id);
                }
            });
        await member.roles.set([]);
        member.roles.add(process.env.MUTE_ROLE);

        // Initialize mute expiry date
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + days);

        const newMute = new Mutes({
            userId: member.id,
            username: `${member.user.tag}`,

            authorId: interaction.user.id,
            authorName: `${interaction.user.tag}`,

            roles: userRoles,

            reason,
            length: days || null,
            expiresAt: days ? expiresAt : null,
        });
        await newMute.save();

        const muteEmbed = new MessageEmbed()
            .setColor(process.env.SUCCESS_COLOR)
            .setImage('https://i.stack.imgur.com/Fzh0w.png')
            .setAuthor('Mykistys myönnetty', client.user.displayAvatarURL())
            .setDescription(`Käyttäjälle **${member.user.tag}** on myönnetty mykistys!`)
            .addFields([
                { name: 'Käyttäjä', value: `${member.user.tag}`, inline: true },
                { name: 'Syynä', value: `${reason}`, inline: true },
                {
                    name: 'Rankaisija',
                    value: `${interaction.user.username}`,
                    inline: true,
                },
                { name: 'Annettu', value: `<t:${timeUtils.epochConverter(new Date())}:R>`, inline: true },
                {
                    name: 'Kesto',
                    value: days ? `${days} päivää` : '**Ikuinen**',
                    inline: true,
                },
                days
                    ? { name: 'Loppuu', value: `<t:${timeUtils.epochConverter(expiresAt)}:R>`, inline: true }
                    : { name: '\u200B', value: `\u200B`, inline: true },
            ])
            .setFooter(interaction.user.username, interaction.user.displayAvatarURL())
            .setTimestamp();

        interaction.reply({ embeds: [muteEmbed], ephemeral: silent });
    },
};
