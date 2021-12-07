const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed, Permissions } = require('discord.js');
const Discord = require('discord.js');
const Bans = require('../models/banModel');
const timeUtils = require('../utils/timeUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Anna porttikielto käyttäjälle!')
        .setDefaultPermission(false)
        .addUserOption(option =>
            option.setName('käyttäjä').setDescription('Käyttäjä, jolle haluat antaa porttikiellon?').setRequired(true),
        )
        .addStringOption(option =>
            option.setName('syy').setDescription('Miksi porttikielto annetaan käyttäjälle?').setRequired(true),
        )
        .addBooleanOption(option =>
            option
                .setName('hiljainen')
                .setDescription('Haluatko porttikiellon olevan hiljainen (-s)?')
                .setRequired(true),
        )
        .addIntegerOption(option =>
            option.setName('aika').setDescription('Kuinka monta päivää porttikielto kestää?').setRequired(false),
        ),

    /**
     * @description Ban command
     * @param {Discord.Client} client
     * @param {Discord.Interaction} interaction
     * @returns {void}
     */
    async execute(client, interaction) {
        const member = interaction.options.getMember('käyttäjä');
        const days = interaction.options.getInteger('aika');
        const reason = interaction.options.getString('syy');
        const silent = interaction.options.getBoolean('hiljainen');

        const errorEmbedBase = new MessageEmbed()
            .setColor(process.env.ERROR_COLOR)
            .setImage('https://i.stack.imgur.com/Fzh0w.png')
            .setAuthor('Tapahtui virhe', client.user.displayAvatarURL())
            .setFooter(interaction.user.username, interaction.user.displayAvatarURL())
            .setTimestamp();

        const isBanned = await Bans.findOne({ userId: member.id, active: true });
        if (isBanned) {
            errorEmbedBase.setDescription(`Käyttäjällä **${member.user.tag}** on jo porttikielto!`).addFields([
                { name: 'Käyttäjä', value: `${isBanned.username}#${isBanned.userDiscriminator}`, inline: true },
                { name: 'Syynä', value: `${isBanned.reason}`, inline: true },
                { name: 'Rankaisija', value: `${isBanned.authorName}#${isBanned.authorDiscriminator}`, inline: true },
                { name: 'Annettu', value: `<t:${timeUtils.epochConverter(isBanned.createdAt)}:R>`, inline: true },
                {
                    name: 'Kesto',
                    value: isBanned.length ? `${isBanned.length} päivää` : '**Ikuinen**',
                    inline: true,
                },
                isBanned.expiresAt
                    ? { name: 'Loppuu', value: `<t:${timeUtils.epochConverter(isBanned.expiresAt)}:R>`, inline: true }
                    : { name: '\u200B', value: `\u200B`, inline: true },
            ]);
            return interaction.reply({ embeds: [errorEmbedBase], ephemeral: true });
        }

        // Validation
        if (member.bot) {
            errorEmbedBase.setDescription(`Et voi antaa porttikieltoa botille!`);
            return interaction.reply({ embeds: [errorEmbedBase], ephemeral: true });
        }
        if (member.id === interaction.user.id) {
            errorEmbedBase.setDescription(`Et voi antaa porttikieltoa itsellesi!`);
            return interaction.reply({ embeds: [errorEmbedBase], ephemeral: true });
        }
        if (member.permissions.has(Permissions.FLAGS.ADMINISTRATOR)) {
            errorEmbedBase.setDescription(`Et voi antaa porttikieltoa ylläpitäjälle!`);
            return interaction.reply({ embeds: [errorEmbedBase], ephemeral: true });
        }
        if (reason.length < 4 || reason.length > 200) {
            errorEmbedBase.setDescription(`Porttikiellon syyn täytyy olla 4-200 merkkiä pitkä!`);
            return interaction.reply({ embeds: [errorEmbedBase], ephemeral: true });
        }
        if (days && (days < 1 || days > 365)) {
            errorEmbedBase.setDescription(
                `Porttikiellon keston täytyy olla 1-365 päivää! Voit myös antaa ikuisen porttikiellon jättämällä aika-arvon huomioimatta.`,
            );
            return interaction.reply({ embeds: [errorEmbedBase], ephemeral: true });
        }

        // Save user roles before ban
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
        member.roles.add(process.env.BAN_ROLE);

        // Initialize ban expiry date
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + days);

        const newBan = new Bans({
            userId: member.id,
            username: member.user.username,
            userDiscriminator: member.user.discriminator,

            authorId: interaction.user.id,
            authorName: interaction.user.username,
            authorDiscriminator: interaction.user.discriminator,

            roles: userRoles,

            reason,
            length: days || null,
            expiresAt: days ? expiresAt : null,
        });
        await newBan.save();

        const banEmbed = new MessageEmbed()
            .setColor(process.env.SUCCESS_COLOR)
            .setImage('https://i.stack.imgur.com/Fzh0w.png')
            .setAuthor('Porttikielto myönnetty', client.user.displayAvatarURL())
            .setDescription(`Käyttäjälle **${member.user.tag}** on myönnetty porttikielto!`)
            .addFields([
                { name: 'Käyttäjä', value: `${member.user.tag}`, inline: true },
                { name: 'Syynä', value: `${reason}`, inline: true },
                {
                    name: 'Rankaisija',
                    value: `${interaction.user.username}#${interaction.user.discriminator}`,
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

        interaction.reply({ embeds: [banEmbed], ephemeral: !!silent });
    },
};
