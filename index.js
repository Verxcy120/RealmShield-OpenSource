const { Client, GatewayIntentBits, REST, Routes, Events } = require('discord.js');
const realms = require('./realm'); // Ensure the path is correct
const config = require('./config.json'); // Load configuration from JSON

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ]
});

// Define commands to register
const commands = [
    {
        name: 'rename',
        description: 'Rename the realm',
        options: [
            {
                name: 'name',
                type: 3, // Type 3 is for string
                description: 'The new name for the realm',
                required: true
            }
        ]
    },
    {
        name: 'open',
        description: 'Open the realm'
    },
    {
        name: 'close',
        description: 'Close the realm'
    },
    {
        name: 'players',
        description: 'List players currently in the realm'
    },
    {
        name: 'backup',
        description: 'Backup the realm'
    },
    {
        name: 'activity',
        description: 'Generate an activity graph for the realm'
    }
];

// Register the slash commands
const rest = new REST({ version: '10' }).setToken(config.botToken);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationCommands(config.clientId), // Replace with your actual bot's client ID
            { body: commands }
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();

// Client ready event
client.once(Events.ClientReady, () => {
    console.log(`Logged in as ${client.user.tag}!`);
    console.log('Connecting to realms...');
    
    // Initialize realms
    realms.getRealms().forEach((realm) => {
        realms.spawnBot(realm); // Ensure spawnBot is defined in realm.js
    });
});

// Handle incoming commands
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName, options } = interaction;
    const realm = realms.getRealms()[0]; // Get the first realm for simplicity, adjust as needed

    if (commandName === 'rename') {
        const newName = options.getString('name');
        await realms.renameRealm(realm, newName);
        await interaction.reply(`Realm renamed to: ${newName}`);
    } else if (commandName === 'open') {
        await realms.setRealmState(realm, true);
        await interaction.reply('Realm has been opened.');
    } else if (commandName === 'close') {
        await realms.setRealmState(realm, false);
        await interaction.reply('Realm has been closed.');
    } else if (commandName === 'players') {
        const playersList = await realms.getPlayersList(realm);
        await interaction.reply(`Players currently in the realm: ${playersList}`);
    } else if (commandName === 'backup') {
        await realms.backupRealm(realm);
        await interaction.reply(`Backup initiated for ${realm.realmName}.`);
    } else if (commandName === 'activity') {
        await realms.generateActivityGraph(realm);
        await interaction.reply(`Realm activity graph generated.`);
    }
});

// Login to Discord
client.login(config.botToken); // Use token from your config
