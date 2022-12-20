"use strict";
// PLEASE NOTE
// Shit module has weak typescript support. Too lazy to fix it so this
// file stays as js.
// TODO: Fix?
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
<<<<<<< Updated upstream
=======
Object.defineProperty(exports, "__esModule", { value: true });
exports.paginationHandler = void 0;
const discord_js_pagination_1 = require("@psibean/discord.js-pagination");
const config_1 = require("../config");
const paginationHandler = (interaction, pages) => __awaiter(void 0, void 0, void 0, function* () {
    const buttons = [
        {
            label: "Ensimmäinen",
            emoji: "⏪",
            style: "SECONDARY",
            disabled: true
        },
        {
            label: "Edellinen",
            disabled: true
        },
        {
            label: "Seuraava",
            disabled: true
        },
        {
            label: "Viimeinen",
            emoji: "⏩",
            style: "SECONDARY",
            disabled: true
        }
    ];
    // eslint-disable-next-line no-shadow
    const identifiersResolver = ({ interaction, paginator }) => {
        const val = interaction.component.label.toLowerCase();
        let { pageIdentifier } = paginator.currentIdentifiers;
        switch (val) {
            case "ensimmäinen":
                return paginator.initialIdentifiers;
            case "edellinen":
                pageIdentifier -= 1;
                break;
            case "seuraava":
                pageIdentifier += 1;
                break;
            case "viimeinen":
                pageIdentifier = paginator.maxNumberOfPages - 1;
        }
        if (pageIdentifier < 0) {
            pageIdentifier =
                paginator.maxNumberOfPages +
                (pageIdentifier % paginator.maxNumberOfPages);
        }
        else if (pageIdentifier >= paginator.maxNumberOfPages) {
            pageIdentifier %= paginator.maxNumberOfPages;
        }
        return Object.assign(Object.assign({}, paginator.currentIdentifiers), { pageIdentifier });
    };
    const buttonPaginator = new discord_js_pagination_1.ButtonPaginator(interaction, {
        pages,
        buttons,
        identifiersResolver
    });
    buttonPaginator.on(discord_js_pagination_1.PaginatorEvents.PAGINATION_READY, (paginator) => {
        for (const actionRow of paginator.messageActionRows) {
            for (const button of actionRow.components) {
                button.disabled = false;
            }
        }
        return interaction.editReply(paginator.currentPage);
    });
    buttonPaginator.on(discord_js_pagination_1.PaginatorEvents.COLLECT_ERROR, () => __awaiter(void 0, void 0, void 0, function* () {
        try {
            /**
             * @type {Message}
             */
            const message = yield interaction.fetchReply();
            /**
             * @type {EmbedBuilder}
             */
            const embed = message.embeds[0];
            const components = message.components;
            components[0].components.forEach((component) => {
                component.disabled = true;
            });
            embed.setColor(config_1.config.COLORS.ERROR);
            return interaction.editReply({
                embeds: [embed],
                components: components
            });
        }
        catch (error) {
            if (error.code)
                return;
            return console.log(error);
        }
    }));
    buttonPaginator.on(discord_js_pagination_1.PaginatorEvents.PAGINATION_END, () => __awaiter(void 0, void 0, void 0, function* () {
        try {
            /**
             * @type {Message}
             */
            const message = yield interaction.fetchReply();
            /**
             * @type {EmbedBuilder}
             */
            const embed = message.embeds[0];
            const components = message.components;
            components[0].components.forEach((component) => {
                component.disabled = true;
            });
            embed.setColor(config_1.config.COLORS.ERROR);
            return interaction.editReply({
                embeds: [embed],
                components: components
            });
        }
        catch (error) {
            if (error.code)
                return;
            return console.log(error);
        }
    }));
    yield buttonPaginator.send();
    return buttonPaginator.message;
});
exports.paginationHandler = paginationHandler;
>>>>>>> Stashed changes
