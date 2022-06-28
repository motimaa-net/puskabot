import { Client } from "discord.js";
import cron from "node-cron";
import { config } from "../config";
import Bans from "../models/banModel";
import Mutes from "../models/muteModel";
import Warns from "../models/warnModel";

export const banHandler = async (client: Client, isCron: boolean) => {
  const removeExpiredBans = async () => {
    const activeBans = await Bans.find({ active: true });
    const expiredBans = [];

    for (let x = 0; x < activeBans.length; x++) {
      const banToCheck = activeBans[x];
      if (
        banToCheck.expiration.expiresAt &&
        banToCheck.expiration.expiresAt < new Date()
      ) {
        expiredBans.push(banToCheck._id);

        // Fetch the banned user and give old roles back if user is still on server + send message to user that ban has expired
        client.guilds.cache
          .get(config.GUILD_ID)
          ?.members.fetch(banToCheck.user.id)
          .then((member) => {
            if (member) {
              member.roles.set(banToCheck.roles);
              member
                .send({
                  content: `Porttikieltosi on päättynyt!`
                })
                .catch((e) => {
                  if (e.code === 50007) return;
                  console.log(e);
                });
            }
          });
      }
    }

    // Update all expired bans to inactive
    await Bans.updateMany(
      { _id: { $in: expiredBans } },
      { $set: { active: false } }
    );

    if (expiredBans.length > 0) {
      console.log(
        `> ${expiredBans.length} porttikieltoa vanheni ja käyttäjät on vapaita jälleen.`
      );
    }
  };

  // Cron task for removing expired bans
  try {
    // Run after startup
    await removeExpiredBans();

    // Runs every hour
    if (isCron) {
      cron.schedule("*/15 * * * *", () => {
        removeExpiredBans();
      });
    }
  } catch (error) {
    console.log(error);
  }
};

export const warnHandler = async (client: Client, isCron: boolean) => {
  const removeExpiredWarns = async () => {
    const activeWarnings = await Warns.find({ active: true });
    const expiredWarns = [];
    for (let x = 0; x < activeWarnings.length; x++) {
      const warnToCheck = activeWarnings[x];
      if (
        warnToCheck.expiration.expiresAt &&
        warnToCheck.expiration.expiresAt < new Date()
      ) {
        expiredWarns.push(warnToCheck._id);
      }
    }
    await Warns.updateMany(
      { _id: { $in: expiredWarns } },
      { $set: { active: false } }
    );
    if (expiredWarns.length > 0) {
      console.log(
        `=> ${expiredWarns.length} vanhentunutta varoitusta poistettu.`
      );
    }
  };
  try {
    // Run after startup
    await removeExpiredWarns();

    // Runs every hour
    if (isCron) {
      cron.schedule("*/15 * * * *", () => {
        removeExpiredWarns();
      });
    }
  } catch (error) {
    console.log(error);
  }
};

export const muteHandler = async (client: Client, isCron: boolean) => {
  const removeExpiredMutes = async () => {
    const activeMutes = await Mutes.find({ active: true });
    const expiredMutes = [];

    for (let x = 0; x < activeMutes.length; x++) {
      const muteToCheck = activeMutes[x];
      if (
        muteToCheck.expiration.expiresAt &&
        muteToCheck.expiration.expiresAt < new Date()
      ) {
        expiredMutes.push(muteToCheck._id);

        // Fetch the banned user and give old roles back if user is still on server + send message to user that ban has expired
        client.guilds.cache
          .get(config.GUILD_ID)
          ?.members.fetch(muteToCheck.user.id)
          .then((member) => {
            if (member) {
              member
                .send({
                  content: `Mykistyksesi on päättynyt!`
                })
                .catch((e) => {
                  if (e.code === 50007) return;
                  console.log(e);
                });
            }
          });
      }
    }

    // Update all expired Mutes to inactive
    await Mutes.updateMany(
      { _id: { $in: expiredMutes } },
      { $set: { active: false } }
    );

    if (expiredMutes.length > 0) {
      console.log(
        `> ${expiredMutes.length} mykistystä vanheni ja käyttäjät voival osallistua keskusteluun.`
      );
    }
  };

  // Cron task for removing expired bans
  try {
    // Run after startup
    await removeExpiredMutes();

    // Runs every hour
    if (isCron) {
      cron.schedule("*/15 * * * *", () => {
        removeExpiredMutes();
      });
    }
  } catch (error) {
    console.log(error);
  }
};

export const precenceUpdater = (client: Client) => {
  const updatePrecense = async () => {
    const members = await (
      await client.guilds.cache.get(config.GUILD_ID)
    )?.members.fetch();
    const memberCount = members?.filter((member) => !member.user.bot).size;

    return client.user?.setActivity(`${memberCount ?? 0} käyttäjää`, {
      type: "WATCHING"
    });
  };
  try {
    // Run after startup
    updatePrecense();

    // Runs every 15minutes
    cron.schedule("*/15 * * * *", () => {
      updatePrecense();
    });
  } catch (error) {
    console.log(error);
  }
};
