const { MessageEmbed, Client, Interaction, Permissions } = require('discord.js');
const config = require('../../config.json');
const Bans = require('../models/banModel');
const cronTasks = require('../utils/cronTasks');
const logger = require('../utils/logger');
const timeUtils = require('../utils/timeUtils');

module.exports = {
    name: 'interactionCreate',
    /**
     * @description Called when a new interaction is created
     * @param {Client} client
     * @param {Interaction} interaction
     * @returns {void}
     */
    async execute(client, interaction) {
        // Handle commands
        if (interaction.isCommand()) {
            // Backup check because illuminati is real
            if (!interaction?.member.permissions.has(Permissions.FLAGS.MANAGE_MESSAGES)) return;

            const command = client.commands.get(interaction.commandName);
            if (!command) return;

            try {
                const banPromise = cronTasks.banHandler(client, false);
                const cronPromise = cronTasks.warnHandler(client, false);
                const mutePromise = cronTasks.muteHandler(client, false);
                await Promise.all([banPromise, cronPromise, mutePromise]);

                await command.execute(client, interaction);
                logger(interaction);
                return;
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: 'Komentoa suorittaessa ilmeni virhe!', ephemeral: true });
            }
        }

        // Handle buttons
        if (interaction.isButton()) {
            if (interaction.customId === 'banInfo') {
                const banDetails = await Bans.findOne({ userId: interaction.user.id, active: true });
                if (!banDetails) {
                    return interaction.reply({ content: 'Sinulla ei ole porttikieltoa!', ephemeral: true });
                }
                const banInfoEmbed = new MessageEmbed()
                    .setColor(config.COLORS.SUCCESS)
                    .setImage('https://i.stack.imgur.com/Fzh0w.png')
                    .setAuthor({ name: 'Porttikielto myönnetty', iconURL: client.user.displayAvatarURL() })
                    .setDescription(`Sinulle on myönnetty porttikielto!`)
                    .addFields([
                        { name: 'Käyttäjä', value: `${interaction.user.tag}`, inline: true },
                        { name: 'Syynä', value: `${banDetails.reason}`, inline: true },
                        {
                            name: 'Rankaisija',
                            value: `${banDetails.authorName}`,
                            inline: true,
                        },
                        {
                            name: 'Annettu',
                            value: `<t:${timeUtils.epochConverter(banDetails.createdAt)}:R>`,
                            inline: true,
                        },
                        {
                            name: 'Kesto',
                            value: banDetails.days ? `${banDetails.days} päivää` : '**Ikuinen**',
                            inline: true,
                        },
                        banDetails.days
                            ? {
                                  name: 'Loppuu',
                                  value: `<t:${timeUtils.epochConverter(banDetails.expiresAt)}:R>`,
                                  inline: true,
                              }
                            : { name: '\u200B', value: `\u200B`, inline: true },
                    ])
                    .setFooter({ text: interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
                    .setTimestamp();
                return interaction.reply({ embeds: [banInfoEmbed], ephemeral: true });
            } else if (interaction.customId.startsWith('selfRole-')) {
                await interaction.deferReply({ ephemeral: true });
                const roleId = interaction.customId.split('-')[1];
                const roleToGive = interaction.guild.roles.cache.find(role => role.id === roleId);
                if (!roleToGive) {
                    return interaction.editReply({
                        content: 'Roolia ei löytynyt! Ilmoita tästä palvelimen ylläpitäjille.',
                        ephemeral: true,
                    });
                }
                try {
                    if (!interaction.member.roles.cache.has(roleToGive.id)) {
                        await interaction.member.roles.add(roleToGive);
                        return interaction.editReply({
                            content: `Olet lisännyt itsellesi roolin **${roleToGive.name}**!`,
                            ephemeral: true,
                        });
                    } else {
                        interaction.member.roles.remove(roleToGive.id);
                        return interaction.editReply({
                            content: `Poistit itseltäsi roolin **${roleToGive.name}**!`,
                            ephemeral: true,
                        });
                    }
                } catch (error) {
                    if (error.code === 10062) return;
                    console.error(error);
                    return interaction.editReply({
                        content: 'Tapahtui virhe! Ilmoita tästä palvelimen ylläpitäjille.',
                        ephemeral: true,
                    });
                }
            }
        }
    },
};
