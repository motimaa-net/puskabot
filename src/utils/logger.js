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

    // Create a string of time in format HH:MM:SS. If the time is less than 10, add a 0 before it.
    const time = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;
    const timeString = time
        .split(':')
        .map(t => (t.length === 1 ? `0${t}` : t))
        .join(':');

    console.log(
        `[${timeString}] ${interaction.user.username} suoritti komennon ${interaction.commandName} ${commandArgs.join(
            ' ',
        )}`,
    );
};

module.exports = logger;
