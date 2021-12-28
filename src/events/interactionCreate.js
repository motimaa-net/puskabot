const { MessageEmbed, Client, Interaction, Permissions } = require('discord.js');
const Bans = require('../models/banModel');
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
                await command.execute(client, interaction);
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
                    .setColor(process.env.SUCCESS_COLOR)
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
                    .setFooter(interaction.user.username, interaction.user.displayAvatarURL())
                    .setTimestamp();
                return interaction.reply({ embeds: [banInfoEmbed], ephemeral: true });
            }
        }
    },
};
