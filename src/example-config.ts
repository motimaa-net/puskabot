import { HexColorString } from "discord.js";

type SelfRoleType = {
  ID: string;
  NAME: string;
  EMOJI: string;
};

type ColorsType = {
  SUCCESS: HexColorString;
  ERROR: HexColorString;
  WARNING: HexColorString;
};

export type ConfigType = {
  BOT_TOKEN: string;
  MONGODB_URI: string;
  CLIENT_ID: string;
  GUILD_ID: string;
  STAFF_ROLES: string[];
  ROLE_CHANNEL: string;
  COLORS: ColorsType;
  BAN_ROLE: string;
  BAN_CHANNEL: string;
  TICKET_CHANNEL: string;
  TICKET_CATEGORY: string;
  SPAM_HANDLER: boolean;
  WARN_EXPIRES: number;
  WARN_THRESHOLD: number;
  WARN_BAN_DAYS: number;
  DELETE_INVITES: boolean;
  SELF_ROLES: SelfRoleType[];
};

export const config: ConfigType = {
  BOT_TOKEN: "BOT_TOKEN",
  MONGODB_URI: "MONGODB_URI",
  CLIENT_ID: "CLIENT_ID",
  GUILD_ID: "GUILD_ID",
  STAFF_ROLES: ["STAFF_ROLE_ID"],
  ROLE_CHANNEL: "ROLE_CHANNEL_ID",
  COLORS: {
    SUCCESS: "#55FF55",
    ERROR: "#FF5555",
    WARNING: "#FFFF55"
  },
  BAN_ROLE: "BAN_ROLE",
  BAN_CHANNEL: "BAN_CHANNEL",
  TICKET_CHANNEL: "TICKET_CHANNEL_ID",
  TICKET_CATEGORY: "TICKET_CATEGORY_ID",
  WARN_EXPIRES: 30,
  WARN_THRESHOLD: 4,
  WARN_BAN_DAYS: 30,
  DELETE_INVITES: true,
  SPAM_HANDLER: false,
  SELF_ROLES: [
    {
      ID: "ROLE_ID",
      NAME: "Minecraft",
      EMOJI: "⛏"
    },
    {
      ID: "ROLE_ID",
      NAME: "FiveM",
      EMOJI: "👮"
    },
    {
      ID: "ROLE_ID",
      NAME: "Yhteisö",
      EMOJI: "✨"
    },
    {
      ID: "ROLE_ID",
      NAME: "Viikkokooste",
      EMOJI: "👥"
    }
  ]
};
