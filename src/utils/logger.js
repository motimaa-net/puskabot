const { CommandInteraction } = require('discord.js');

/**
 * @description Logs interactions to console
 * @param {CommandInteraction} interaction
 * @returns {void}
 */
const logger = interaction => {
    const now = new Date();
    const commandArgs = [];
    interaction.options.data.forEach(option => {
        commandArgs.push(`(${option.name} = ${option.value})`);
    });
    console.log(
        `[${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}] ${interaction.user.username} suoritti komennon ${
            interaction.commandName
        } ${commandArgs.join(' ')}`,
    );
};

module.exports = logger;
