import { Client, GuildMember } from "discord.js";
import { config } from "../config";
import Bans from "../models/banModel";

export default {
  name: "guildMemberAdd",
  async execute(_: Client, guildMember: GuildMember) {
    const { user } = guildMember;

    // Check if user is banned on join, if so, give ban role back.
    const isBanned = await Bans.findOne({ "user.id": user.id, active: true });
    if (isBanned) {
      // Update user's ban.
      await Bans.findOneAndUpdate(
        { userId: user.id },
        {
          $set: {
            userId: user.id,
            username: user.tag
          }
        }
      );

      guildMember.roles.add(config.BAN_ROLE);
    }
  }
};
