const Discord = require('discord.js');
module.exports = {
    name: 'interactionCreate',
    /**
     * @description Called when a new interaction is created
     * @param {Discord.Client} client
     * @param {Discord.Interaction} interaction
     * @returns {void}
     */
    async execute(client, interaction) {
        if (!interaction.isCommand()) return;

        const command = client.commands.get(interaction.commandName);

        if (!command) return;

        try {
            await command.execute(client, interaction);
            return;
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'Komentoa suorittaessa ilmeni virhe!', ephemeral: true });
        }
    },
};
