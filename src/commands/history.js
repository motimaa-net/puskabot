const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed } = require('discord.js');
const Discord = require('discord.js');
const Bans = require('../models/banModel');
const Warns = require('../models/warnModel');
const paginationHandler = require('../utils/paginationHandler');
const timeUtils = require('../utils/timeUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('history')
        .setDescription('Katso käyttäjän rikehistoria!')
        .setDefaultPermission(false)
        .addUserOption(option =>
            option.setName('käyttäjä').setDescription('Käyttäjä, jonka rikkeet haluat tarkastaa?').setRequired(true),
        )
        .addBooleanOption(option =>
            option.setName('hiljainen').setDescription('Haluatko historian olevan hiljainen (-s)?').setRequired(true),
        ),

    /**
     * @description History command (infractions history)
     * @param {Discord.Client} client
     * @param {Discord.Interaction} interaction
     * @returns {void}
     */
    async execute(client, interaction) {
        const member = interaction.options.getMember('käyttäjä');
        const silent = interaction.options.getBoolean('hiljainen');

        await interaction.deferReply({ ephemeral: silent });

        const errorEmbedBase = new MessageEmbed()
            .setColor(process.env.ERROR_COLOR)
            .setImage('https://i.stack.imgur.com/Fzh0w.png')
            .setAuthor('Tapahtui virhe', client.user.displayAvatarURL())
            .setFooter(interaction.user.username, interaction.user.displayAvatarURL())
            .setTimestamp();

        const totalBans = await Bans.find({ userId: member.id });
        const totalWarns = await Warns.find({ userId: member.id });

        const activeBans = totalBans.filter(ban => ban.active);
        const activeWarns = totalWarns.filter(warn => warn.active);
        if ((!totalBans && !totalWarns) || (totalBans.length === 0 && totalWarns.length === 0)) {
            const errorEmbed = errorEmbedBase.setDescription('Käyttäjällä ei ole rikehistoriaa!');
            return interaction.editReply({ embeds: [errorEmbed], ephemeral: silent });
        }

        // Combine totalBans and totalWarns into one array and sort it by date
        const combinedInfractions = [...totalBans, ...totalWarns];
        combinedInfractions.sort((a, b) => b.createdAt - a.createdAt);

        const historyEmbed = new MessageEmbed()
            .setColor(process.env.SUCCESS_COLOR)
            .setImage('https://i.stack.imgur.com/Fzh0w.png')
            .setAuthor(
                `Rikehistoria tiedot ${combinedInfractions.length > 0 ? `(1/${combinedInfractions.length + 1})` : ``}`,
                client.user.displayAvatarURL(),
            )
            .setDescription(`Käyttäjän **${member.user.tag}** rikehistoria!`)
            .setFooter(interaction.user.username, interaction.user.displayAvatarURL())
            .setTimestamp();

        // Warning fields
        historyEmbed.addFields([
            {
                name: 'Varoituksia yhteensä',
                value: `${totalWarns.length}`,
                inline: true,
            },
            { name: 'Aktiiviset varoitukset', value: `${activeWarns.length}`, inline: true },
            { name: '\u200B', value: `\u200B`, inline: true },
        ]);
        if (activeWarns.length > 0) {
            const activeWarnsFormatted = [];
            for (let x = 0; x < activeWarns.length; x++) {
                const warn = activeWarns[x];
                activeWarnsFormatted.push(
                    `\`\`\`yaml\n${x + 1}: ${warn.authorName} varoitti syystä "${
                        warn.reason
                    }" # (${`${timeUtils.daysAgo(warn.createdAt)}`})\`\`\``,
                );
            }
            historyEmbed.addField('Aktiiviset varoitukset', `${activeWarnsFormatted.join('')}`, false);
        }

        historyEmbed.addFields([
            {
                name: 'Porttikieltoja yhteensä',
                value: `${totalBans.length}`,
                inline: true,
            },
            {
                name: 'Aktiivinen porttikielto',
                value: `${
                    activeBans.length > 0
                        ? activeBans[0]?.length
                            ? `Kyllä (_${activeBans[0].length} päivää_)`
                            : '__Ikuinen__'
                        : 'Ei'
                }`,
                inline: true,
            },
            { name: '\u200B', value: `\u200B`, inline: true },
        ]);
        if (activeBans.length > 0) {
            historyEmbed.addFields([
                {
                    name: 'Porttikielto vanhenee',
                    value: activeBans[0].expiresAt
                        ? `<t:${timeUtils.epochConverter(activeBans[0].expiresAt)}:R>`
                        : '__Ikuinen__',
                    inline: true,
                },
                {
                    name: 'Porttikiellon antaja',
                    value: `${activeBans[0].authorName}`,
                    inline: true,
                },
                {
                    name: 'Porttikiellon syy',
                    value: `${activeBans[0].reason}`,
                    inline: true,
                },
            ]);
        }

        const infinfractionsEmbeds = [];
        infinfractionsEmbeds.push(historyEmbed);

        combinedInfractions.forEach((infraction, index) => {
            const infinfractionsEmbed = new MessageEmbed()
                .setColor(infraction.active ? process.env.SUCCESS_COLOR : process.env.EXPIRED_COLOR)
                .setImage('https://i.stack.imgur.com/Fzh0w.png')
                .setAuthor(
                    infraction?.roles
                        ? `Porttikielto (${index + 2}/${combinedInfractions.length + 1})`
                        : `Varoitus (${index + 2}/${combinedInfractions.length + 1})`,
                    client.user.displayAvatarURL(),
                )
                .setDescription(
                    `Käyttäjälle **${infraction.username}** on myönnetty ${
                        infraction?.roles ? 'porttikielto!' : 'varoitus!'
                    }!`,
                )
                .setFooter(interaction.user.username, interaction.user.displayAvatarURL())
                .setTimestamp()
                .addFields([
                    { name: 'Käyttäjä', value: `${infraction.username}`, inline: true },
                    { name: 'Syynä', value: `${infraction.reason}`, inline: true },
                    {
                        name: 'Rankaisija',
                        value: `${infraction.authorName}`,
                        inline: true,
                    },
                    { name: 'Annettu', value: `<t:${timeUtils.epochConverter(infraction.createdAt)}:R>`, inline: true },
                    infraction?.roles
                        ? {
                              name: 'Kesto',
                              value: infraction.days ? `${infraction.days} päivää` : '**Ikuinen**',
                              inline: true,
                          }
                        : {
                              name: 'Kesto',
                              value: `${process.env.WARN_EXPIRES} päivää`,
                              inline: true,
                          },
                    infraction.days
                        ? {
                              name: 'Vanhenee',
                              value: `<t:${timeUtils.epochConverter(infraction.expiresAt)}:R>`,
                              inline: true,
                          }
                        : { name: '\u200B', value: `\u200B`, inline: true },
                ]);
            infinfractionsEmbeds.push(infinfractionsEmbed);
        });

        paginationHandler(interaction, infinfractionsEmbeds);
    },
};
