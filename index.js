const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');
const fs = require('fs');
const config = require('./config.json');
const realms = require('./realm');
require('colors');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Slash command registration
const commands = [
    {
        name: 'realm',
        description: 'Manage realm bans, unbans, and joins',
        options: [
            {
                type: 1,
                name: 'ban',
                description: 'Ban a device or player from the realm',
                options: [
                    {
                        type: 3,
                        name: 'device',
                        description: 'Device to ban',
                        required: true
                    },
                    {
                        type: 3,
                        name: 'player',
                        description: 'Player to ban',
                        required: false
                    }
                ]
            },
            {
                type: 1,
                name: 'unban',
                description: 'Unban a device or player',
                options: [
                    {
                        type: 3,
                        name: 'device',
                        description: 'Device to unban',
                        required: true
                    },
                    {
                        type: 3,
                        name: 'player',
                        description: 'Player to unban',
                        required: false
                    }
                ]
            },
            {
                type: 1,
                name: 'whitelist',
                description: 'Manage whitelisted players',
                options: [
                    {
                        type: 3,
                        name: 'add',
                        description: 'Add player to whitelist',
                        required: false
                    },
                    {
                        type: 3,
                        name: 'remove',
                        description: 'Remove player from whitelist',
                        required: false
                    }
                ]
            }
        ]
    }
];

// Register commands
const rest = new REST({ version: '10' }).setToken(config.botToken);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');
        await rest.put(Routes.applicationCommands(config.clientId), { body: commands });
        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();

// Log utility
function log(...text) {
    console.log(new Date().toLocaleString().red, ` |  ${text.join(' ')}`);
}

// Send an embedded message to a Discord channel
async function sendEmbed(title, description, colour, channelId) {
    const { EmbedBuilder } = require('discord.js');  // Ensure to require the necessary class here
    const embed = new EmbedBuilder();
    if (title) embed.setAuthor({ name: client.user.displayName, iconURL: client.user.avatarURL({ size: 32 }) });
    if (title) embed.setTitle(title);
    embed.setDescription(description);
    embed.setColor(colour);
    if (title) embed.setTimestamp();

    const channel = await client.channels.fetch(channelId);
    await channel.send({ embeds: [embed] });
}

// Slash command handler
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    const { commandName, options } = interaction;

    if (commandName === 'realm') {
        const realmCode = config.realms[0].realmCode;  // Assuming 1 realm for simplicity
        const device = options.getString('device');
        const player = options.getString('player');

        // Realm Ban Command
        if (interaction.options.getSubcommand() === 'ban') {
            if (device) {
                config.bannedDevices.push(device);
                fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
                await interaction.reply(`Device ${device} has been banned.`);
            }
            if (player) {
                realms.sendCmd(realmCode, `/ban ${player}`);
                await interaction.reply(`Player ${player} has been banned.`);
            }
        }

        // Realm Unban Command
        else if (interaction.options.getSubcommand() === 'unban') {
            if (device) {
                config.bannedDevices = config.bannedDevices.filter((d) => d !== device);
                fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
                await interaction.reply(`Device ${device} has been unbanned.`);
            }
            if (player) {
                realms.sendCmd(realmCode, `/pardon ${player}`);
                await interaction.reply(`Player ${player} has been unbanned.`);
            }
        }

        // Whitelist Management
        else if (interaction.options.getSubcommand() === 'whitelist') {
            const addPlayer = options.getString('add');
            const removePlayer = options.getString('remove');

            if (addPlayer) {
                config.whitelist.push(addPlayer);
                fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
                await interaction.reply(`Player ${addPlayer} added to whitelist.`);
            } else if (removePlayer) {
                config.whitelist = config.whitelist.filter((p) => p !== removePlayer);
                fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
                await interaction.reply(`Player ${removePlayer} removed from whitelist.`);
            }
        }
    }
});

// Bot Ready Event
client.on('ready', () => {
    log(`Logged in as ${client.user.tag}!`);
    log('Connecting to realms...');
    config.realms.forEach((realm) => {
        realms.spawnBot(realm, log);  // Only pass log function
    });
});

client.login(config.botToken);

module.exports = { client, log };  // Export only client and log
