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

type ConfigType = {
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

export const config: ConfigType;
