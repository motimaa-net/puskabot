const { ButtonPaginator, PaginatorEvents } = require('@psibean/discord.js-pagination');
const { Message, MessageEmbed } = require('discord.js');

const paginationHandler = async (interaction, pages) => {
    const buttons = [
        {
            label: 'Ensimmäinen',
            emoji: '⏪',
            style: 'SECONDARY',
            disabled: true,
        },
        {
            label: 'Edellinen',
            disabled: true,
        },
        {
            label: 'Seuraava',
            disabled: true,
        },
        {
            label: 'Viimeinen',
            emoji: '⏩',
            style: 'SECONDARY',
            disabled: true,
        },
    ];
    // eslint-disable-next-line no-shadow
    const identifiersResolver = ({ interaction, paginator }) => {
        const val = interaction.component.label.toLowerCase();
        let { pageIdentifier } = paginator.currentIdentifiers;
        switch (val) {
            case 'ensimmäinen':
                return paginator.initialIdentifiers;
            case 'edellinen':
                pageIdentifier -= 1;
                break;
            case 'seuraava':
                pageIdentifier += 1;
                break;
            case 'viimeinen':
                pageIdentifier = paginator.maxNumberOfPages - 1;
        }

        if (pageIdentifier < 0) {
            pageIdentifier = paginator.maxNumberOfPages + (pageIdentifier % paginator.maxNumberOfPages);
        } else if (pageIdentifier >= paginator.maxNumberOfPages) {
            pageIdentifier %= paginator.maxNumberOfPages;
        }
        return { ...paginator.currentIdentifiers, pageIdentifier };
    };

    const buttonPaginator = new ButtonPaginator(interaction, {
        pages,
        buttons,
        identifiersResolver,
    });
    buttonPaginator.on(PaginatorEvents.PAGINATION_READY, paginator => {
        for (const actionRow of paginator.messageActionRows) {
            for (const button of actionRow.components) {
                button.disabled = false;
            }
        }
        return interaction.editReply(paginator.currentPage);
    });
    buttonPaginator.on(PaginatorEvents.COLLECT_ERROR, async () => {
        try {
            /**
             * @type {Message}
             */
            const message = await interaction.fetchReply();

            /**
             * @type {MessageEmbed}
             */
            const embed = message.embeds[0];

            const components = message.components;
            components[0].components.forEach(component => {
                component.disabled = true;
            });
            embed.setColor(process.env.ERROR_COLOR);
            return interaction.editReply({
                embeds: [embed],
                components: components,
            });
        } catch (error) {
            if (error.code) return;
            return console.log(error);
        }
    });
    buttonPaginator.on(PaginatorEvents.PAGINATION_END, async () => {
        try {
            /**
             * @type {Message}
             */
            const message = await interaction.fetchReply();

            /**
             * @type {MessageEmbed}
             */
            const embed = message.embeds[0];
            const components = message.components;
            components[0].components.forEach(component => {
                component.disabled = true;
            });
            embed.setColor(process.env.ERROR_COLOR);
            return interaction.editReply({
                embeds: [embed],
                components: components,
            });
        } catch (error) {
            if (error.code) return;
            return console.log(error);
        }
    });

    await buttonPaginator.send();
    return buttonPaginator.message;
};
module.exports = paginationHandler;
