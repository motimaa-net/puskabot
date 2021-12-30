const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed, Permissions, Client, CommandInteraction, GuildMember } = require('discord.js');
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
     * @param {Client} client
     * @param {CommandInteraction} interaction
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
            .setAuthor({ name: 'Tapahtui virhe', iconURL: client.user.displayAvatarURL() })
            .setFooter({ text: interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();

        if (!member?.id) {
            errorEmbedBase.setDescription(
                `Kyseistä käyttäjää ei löytynyt! Käyttäjä on todennäköisesti poistunut palvelimelta!`,
            );
            return interaction.reply({ embeds: [errorEmbedBase], ephemeral: true });
        }

        const isBanned = await Bans.findOne({ userId: member.id, active: true });
        if (isBanned) {
            errorEmbedBase.setDescription(`Käyttäjällä **${member.user.tag}** on jo porttikielto!`).addFields([
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
            username: `${member.user.tag}`,

            authorId: interaction.user.id,
            authorName: `${interaction.user.tag}`,

            roles: userRoles,

            reason,
            length: days || null,
            expiresAt: days ? expiresAt : null,
        });
        await newBan.save();

        const banEmbed = new MessageEmbed()
            .setColor(process.env.SUCCESS_COLOR)
            .setImage('https://i.stack.imgur.com/Fzh0w.png')
            .setAuthor({ name: 'Porttikielto myönnetty', iconURL: client.user.displayAvatarURL() })
            .setDescription(`Käyttäjälle **${member.user.tag}** on myönnetty porttikielto!`)
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
            .setFooter({ text: interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();

        interaction.reply({ embeds: [banEmbed], ephemeral: silent });
    },
};
