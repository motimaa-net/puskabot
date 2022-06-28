import { Client, Message } from "discord.js";
import { config } from "../config";

export default {
  name: "messageCreate",
  once: false,
  async execute(client: Client, m: Message) {
    if (m.author.bot) return;

    const staff = m.member?.roles.cache.some((r) =>
      config.STAFF_ROLES.includes(r.id)
    );
    if (staff) return;

    if (config.DELETE_INVITES) {
      const inviteRegex =
        /(https?:\/\/)?(www\.)?(discord\.(gg|io|me|li)|discordapp\.com\/invite)\/[^\s/]+?(?=\b)/gm;

      if (inviteRegex.test(m.content)) {
        // Get the invite from string
        const inviteLink = m.content
          .match(inviteRegex)
          ?.find((invite) => invite);

        if (!inviteLink) return;

        const guildInvites = (await m.guild?.invites.fetch())?.map(
          (invite) => invite.url
        );
        // Check if inviteLink contains any of the guildInvites codes
        if (!guildInvites?.includes(inviteLink)) {
          await m.reply({
            content: `Hei <@${m.member?.user.id}>! Kutsulinkkien jakaminen muille palvelimille on kielletty.`
          });

          m.createdTimestamp += 30000;

          await m.member?.disableCommunicationUntil(
            m.createdTimestamp,
            "Kutsulinkkien jakaminen muille palvelimille on kielletty."
          );

          m.delete().catch((e) => {
            if (e.code) return;
            console.log(e);
          });
        }
      }
    }

    if (m.channel.id === "643450708540129290") {
      await m.react("👍");
      await m.react("👎");
    }
  }
};
