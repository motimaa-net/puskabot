const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed, Permissions } = require('discord.js');
const Discord = require('discord.js');
const Warns = require('../models/warnModel');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unwarn')
        .setDescription('Poista viimeisin varoitus käyttäjältä!')
        .setDefaultPermission(false)
        .addUserOption(option =>
            option
                .setName('käyttäjä')
                .setDescription('Käyttäjä, jolta haluat poistaa porttikiellon?')
                .setRequired(true),
        )
        .addStringOption(option => option.setName('syy').setDescription('Miksi varoitus poistetaan?').setRequired(true))
        .addBooleanOption(option =>
            option
                .setName('hiljainen')
                .setDescription('Haluatko porttikiellon olevan hiljainen (-s)?')
                .setRequired(true),
        ),

    /**
     * @description Unwarn command
     * @param {Discord.Client} client
     * @param {Discord.Interaction} interaction
     * @returns {void}
     */
    async execute(client, interaction) {
        const member = interaction.options.getMember('käyttäjä');
        const reason = interaction.options.getString('syy');
        const silent = interaction.options.getBoolean('hiljainen');

        const errorEmbedBase = new MessageEmbed()
            .setColor(process.env.ERROR_COLOR)
            .setImage('https://i.stack.imgur.com/Fzh0w.png')
            .setAuthor('Tapahtui virhe', client.user.displayAvatarURL())
            .setFooter(interaction.user.username, interaction.user.displayAvatarURL())
            .setTimestamp();

        // Validation
        if (member.bot) {
            errorEmbedBase.setDescription(`Boteilla ei voi olla varoituksia!`);
            return interaction.reply({ embeds: [errorEmbedBase], ephemeral: true });
        }
        if (member.id === interaction.user.id) {
            errorEmbedBase.setDescription(`Et voi poistaa varoitusta itseltäsi!`);
            return interaction.reply({ embeds: [errorEmbedBase], ephemeral: true });
        }
        if (member.permissions.has(Permissions.FLAGS.ADMINISTRATOR)) {
            errorEmbedBase.setDescription(`Tällä henkilöllä ei voi olla varoituksia!`);
            return interaction.reply({ embeds: [errorEmbedBase], ephemeral: true });
        }
        if (reason.length < 4 || reason.length > 200) {
            errorEmbedBase.setDescription(`Varoituksen poistamisen syyn täytyy olla 4-200 merkkiä pitkä!`);
            return interaction.reply({ embeds: [errorEmbedBase], ephemeral: true });
        }

        // Get user's active warnings
        const activeWarnings = await Warns.find({ userID: member.id, active: true }).sort({ createdAt: -1 });
        if (!activeWarnings || activeWarnings.length === 0) {
            errorEmbedBase.setDescription(`Käyttäjällä ei ole aktiivisia varoituksia!`);
            return interaction.reply({ embeds: [errorEmbedBase], ephemeral: true });
        }

        // Unwarn latest warning
        const latestWarning = activeWarnings[0];
        await Warns.findOneAndUpdate({ _id: latestWarning._id }, { $set: { active: false } });

        // New active warnings
        activeWarnings.shift();

        const unwarnEmbed = new MessageEmbed()
            .setColor(process.env.SUCCESS_COLOR)
            .setImage('https://i.stack.imgur.com/Fzh0w.png')
            .setAuthor('Viimeisin varoitus poistettu', client.user.displayAvatarURL())
            .setDescription(`Käyttäjän **${member.user.tag}** viimeisin varoitus on poistettu!`)
            .addFields([
                { name: 'Käyttäjä', value: `${member.user.tag}`, inline: true },
                { name: 'Syynä poistolle', value: `${reason}`, inline: true },
                {
                    name: 'Poistaja',
                    value: `${interaction.user.username}`,
                    inline: true,
                },
                {
                    name: 'Aktiiviset varoitukset',
                    value: `${activeWarnings.length}/${process.env.WARN_THRESHOLD}`,
                    inline: true,
                },
            ])
            .setFooter(interaction.user.username, interaction.user.displayAvatarURL())
            .setTimestamp();

        await interaction.reply({ embeds: [unwarnEmbed], ephemeral: silent });

        // Try notifying user about unwarn
        member
            .send({
                // eslint-disable-next-line max-len
                content: `Viimeisin varoituksesi palvelimella **${interaction.guild.name}** on poistettu. :)`,
                embeds: [unwarnEmbed],
            })
            .catch(e => {
                if (e?.code === 50007 && silent) {
                    return interaction.followUp({
                        // eslint-disable-next-line max-len
                        content: `<@${interaction.user.id}> Käyttäjälle **${member.user.tag}** ei voitu toimittaa tietoa varoituksen poistosta yksityisviestitse, eikä käyttäjä nää ylläolevaa varoitusviestiä, koska hiljaista tilaa on käytetty! Käyttäjä ei ole tietoinen poistetusta varoituksesta.`,
                        ephemeral: true,
                    });
                }
            });
    },
};
