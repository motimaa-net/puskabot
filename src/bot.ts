import { Client, Collection, Intents } from "discord.js";
import { readdirSync } from "fs";
import { config } from "./config";

export type ClientType = {};

const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MEMBERS
  ]
});

// Load events
const eventFiles = readdirSync(`${__dirname}/events`).filter((file) =>
  file.endsWith(".ts")
);

for await (const file of eventFiles) {
  const event = await import(`${__dirname}/events/${file}`);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(client, ...args));
  } else {
    client.on(event.name, (...args) => event.execute(client, ...args));
  }
}

// Load commands
client.commands = new Collection();
const commandFiles = readdirSync(`${__dirname}/commands`).filter((file) =>
  file.endsWith(".ts")
);
for await (const file of commandFiles) {
  const command = await import(`${__dirname}/commands/${file}`);
  console.log(command);
  client.commands.set(command.data.name, command);
}

// Initialize client
client.login(config.BOT_TOKEN);
