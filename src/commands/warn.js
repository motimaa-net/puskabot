const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed, Permissions, Client, Interaction, GuildMember } = require('discord.js');
const Bans = require('../models/banModel');
const Warns = require('../models/warnModel');
const timeUtils = require('../utils/timeUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Anna varoitus käyttäjälle!')
        .setDefaultPermission(false)
        .addUserOption(option =>
            option.setName('käyttäjä').setDescription('Käyttäjä, jolle haluat antaa porttikiellon?').setRequired(true),
        )
        .addStringOption(option =>
            option.setName('syy').setDescription('Miksi porttikielto annetaan käyttäjälle?').setRequired(true),
        )
        .addBooleanOption(option =>
            option.setName('hiljainen').setDescription('Haluatko varoituksen olevan hiljainen (-s)?').setRequired(true),
        ),

    /**
     * @description Warn command
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
            .setFooter(interaction.user.username, interaction.user.displayAvatarURL())
            .setTimestamp();

        // Validation
        const isBanned = await Bans.findOne({ userId: member.id, active: true });
        if (isBanned) {
            errorEmbedBase.setDescription(
                `Käyttäjällä **${member.user.tag}** on porttikielto! Et voi varoittaa käyttäjää jolla on aktiivinen porttikielto!`,
            );
            return interaction.reply({ embeds: [errorEmbedBase], ephemeral: true });
        }
        if (member.bot) {
            errorEmbedBase.setDescription(`Et voi antaa varoitusta botille!`);
            return interaction.reply({ embeds: [errorEmbedBase], ephemeral: true });
        }
        if (member.id === interaction.user.id) {
            errorEmbedBase.setDescription(`Et voi antaa varoitusta itsellesi!`);
            return interaction.reply({ embeds: [errorEmbedBase], ephemeral: true });
        }
        if (member.permissions.has(Permissions.FLAGS.ADMINISTRATOR)) {
            errorEmbedBase.setDescription(`Et voi antaa varoitusta tälle henkilölle!`);
            return interaction.reply({ embeds: [errorEmbedBase], ephemeral: true });
        }
        if (reason.length < 4 || reason.length > 200) {
            errorEmbedBase.setDescription(`Varoituksen syyn täytyy olla 4-200 merkkiä pitkä!`);
            return interaction.reply({ embeds: [errorEmbedBase], ephemeral: true });
        }

        // Initialize warning expiry date based on config
        const warnExpiresAt = new Date();
        warnExpiresAt.setDate(warnExpiresAt.getDate() + parseInt(process.env.WARN_EXPIRES));

        const newWarn = new Warns({
            userId: member.id,
            username: `${member.user.tag}`,

            authorId: interaction.user.id,
            authorName: `${interaction.user.tag}`,

            reason,
            expiresAt: warnExpiresAt,
        });
        await newWarn.save();

        // If active warning are above threshhold then ban user
        const activeWarns = await Warns.find({ userId: member.id, active: true });
        if (activeWarns.length === parseInt(process.env.WARN_THRESHOLD)) {
            // Get user's roles before banning
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

            // Add ban role
            member.roles.add(process.env.BAN_ROLE);

            // Initialize ban expiry date based on config
            const banExpiresAt = new Date();
            banExpiresAt.setDate(banExpiresAt.getDate() + parseInt(process.env.WARN_BAN_DAYS));

            const newBan = new Bans({
                userId: member.id,
                username: `${member.user.tag}`,

                authorId: interaction.user.id,
                authorName: `${interaction.user.tag}`,

                roles: userRoles,

                reason: `${process.env.WARN_THRESHOLD} aktiivista varoitusta`,
                length: process.env.WARN_BAN_DAYS,
                expiresAt: banExpiresAt,
            });
            await newBan.save();

            // Set warning inactive after banning
            await Warns.updateMany({ userId: member.id }, { $set: { active: false } });

            const banEmbed = new MessageEmbed()
                .setColor(process.env.SUCCESS_COLOR)
                .setImage('https://i.stack.imgur.com/Fzh0w.png')
                .setAuthor({ name: 'Porttikielto myönnetty', iconURL: client.user.displayAvatarURL() })
                .setDescription(`Käyttäjälle **${member.user.tag}** on myönnetty porttikielto!`)
                .addFields([
                    { name: 'Käyttäjä', value: `${member.user.tag}`, inline: true },
                    { name: 'Syynä', value: `${process.env.WARN_THRESHOLD} aktiivista varoitusta`, inline: true },
                    {
                        name: 'Rankaisija',
                        value: `${interaction.user.username}`,
                        inline: true,
                    },
                    { name: 'Annettu', value: `<t:${timeUtils.epochConverter(new Date())}:R>`, inline: true },
                    {
                        name: 'Kesto',
                        value: `${process.env.WARN_BAN_DAYS} päivää`,
                        inline: true,
                    },
                    { name: 'Loppuu', value: `<t:${timeUtils.epochConverter(banExpiresAt)}:R>`, inline: true },
                ])
                .addField('\u200B', '\u200B', false)
                .setFooter(interaction.user.username, interaction.user.displayAvatarURL())
                .setTimestamp();

            for (let x = 0; x < activeWarns.length; x++) {
                const warn = activeWarns[x];
                banEmbed.addField(
                    `Varoitus ${x + 1}`,
                    `**${warn.authorName}** varoitti syystä: **${warn.reason}** (${`<t:${timeUtils.epochConverter(
                        warn.createdAt,
                    )}:R>`})`,
                );
            }

            interaction.reply({ embeds: [banEmbed], ephemeral: silent });

            // Try notifying user about the ban
            member
                .send({
                    // eslint-disable-next-line max-len
                    content: `Olet saanut porttikiellon palvelimella **${interaction.guild.name}**.`,
                    embeds: [banEmbed],
                })
                .catch(e => {
                    if (e?.code === 50007 && silent) {
                        return interaction.followUp({
                            // eslint-disable-next-line max-len
                            content: `<@${interaction.user.id}> Käyttäjälle **${member.user.tag}** ei voitu toimittaa tietoa porttikiellosta yksityisviestitse, eikä käyttäjä nää ylläolevaa porttikieltoviestiä, koska hiljaista tilaa on käytetty!.`,
                            ephemeral: true,
                        });
                    }
                });
            return;
        }
        const warnEmbed = new MessageEmbed()
            .setColor(process.env.SUCCESS_COLOR)
            .setImage('https://i.stack.imgur.com/Fzh0w.png')
            .setAuthor({ name: 'Käyttäjää varoitettu', iconURL: client.user.displayAvatarURL() })
            .setDescription(`Käyttäjälle **${member.user.tag}** on annettu varoitus!`)
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
                    value: `${process.env.WARN_EXPIRES} päivää`,
                    inline: true,
                },
                { name: 'Vanhenee', value: `<t:${timeUtils.epochConverter(warnExpiresAt)}:R>`, inline: true },
                {
                    name: 'Aktiiviset varoitukset',
                    value: `${
                        activeWarns
                            ? `${activeWarns.length}/${process.env.WARN_THRESHOLD}`
                            : `0/${process.env.WARN_THRESHOLD}`
                    }`,
                    inline: true,
                },
            ])
            .setFooter(interaction.user.username, interaction.user.displayAvatarURL())
            .setTimestamp();

        await interaction.reply({ embeds: [warnEmbed], ephemeral: silent });

        // Try notifying user about the warn
        member
            .send({
                // eslint-disable-next-line max-len
                content: `Olet saanut varoituksen palvelimella **${interaction.guild.name}**. Mikäli saavutat ${process.env.WARN_THRESHOLD} aktiivista varoitusta saat porttikiellon palvelimelta ${process.env.WARN_BAN_DAYS} päivän ajaksi. Tässä vielä muistutus varoituksestasi :)`,
                embeds: [warnEmbed],
            })
            .catch(e => {
                if (e?.code === 50007 && silent) {
                    return interaction.followUp({
                        // eslint-disable-next-line max-len
                        content: `<@${interaction.user.id}> Käyttäjälle **${member.user.tag}** ei voitu toimittaa tietoa varoituksesta yksityisviestitse, eikä käyttäjä nää ylläolevaa varoitusviestiä, koska hiljaista tilaa on käytetty! Käyttäjä ei ole tietoinen saadusta varoituksesta.`,
                        ephemeral: true,
                    });
                }
            });
    },
};
