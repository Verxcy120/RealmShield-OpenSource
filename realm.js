const axios = require('axios');
const { Authflow, Titles } = require('prismarine-auth');
const bedrock = require('bedrock-protocol');
const { sendEmbed } = require('./index');  // Import sendEmbed from index.js
const config = require('./config.json');
const fs = require('fs');
const uuid = require('uuid');
const players = new Map();
const realmClients = new Map();

const devices = [
    "Undefined", "Android", "iOS", "OSX", "FireOS", "GearVR", "Hololens", 
    "Windows", "Win32", "Dedicated", "TVOS", "PlayStation", "NintendoSwitch", 
    "Xbox", "WindowsPhone"
];

const deviceIds = {
    Android: "1739947436",
    iOS: "1810924247",
    Xbox: "1828326430",
    Windows: "896928775",
    PlayStation: "2044456598",
    FireOS: "1944307183",
    NintendoSwitch: "2047319603"
};

const idsToDevice = Object.fromEntries(Object.entries(deviceIds).map(([key, value]) => [value, key]));

// Enhance anti-cheat detection for suspicious behavior
async function enhanceAntiCheat(client, player, os) {
    const { username, xbox_user_id: xuid } = player;
    const lastLogin = players.get(xuid)?.lastLogin || 0;
    const currentLogin = Date.now();
    const loginInterval = (currentLogin - lastLogin) / 60000; // In minutes

    if (loginInterval < 5) {
        sendCmd(client, `/kick "${username}" Suspicious login frequency detected!\n§7Kicked by §3Realm Shield`);
        return;
    }

    // Update player login time
    players.set(xuid, { ...player, lastLogin: currentLogin });

    if (config.bannedDevices.includes(os) && config.modules.deviceFilter) {
        sendCmd(client, `/kick "${username}" You joined on a banned device!\n§6Device: §c${os}\n§7Kicked by §3Realm Shield`);
        return;
    }

    try {
        const response = await axios.get(`https://userpresence.xboxlive.com/users/xuid(${xuid})`, {
            headers: {
                "Authorization": `XBL3.0 x=${auth.userHash};${auth.XSTSToken}`,
                "Accept": "application/json",
                "x-xbl-contract-version": 3
            }
        });

        const truedevice = response.data.devices?.find(device =>
            device.titles.some(title => title.name.startsWith("Minecraft") && title.state === "Active")
        );
        
        if (!truedevice) {
            sendCmd(client, `/kick "${username}" EditionFaker detected!\n§7Kicked by §3Realm Shield`);
        }
    } catch (error) {
        console.error(`Error verifying profile for ${username}:`, error);
    }
}

// Send commands to the realm client
function sendCmd(client, ...commands) {
    commands.forEach(cmd => {
        const requestId = uuid.v4();
        try {
            client.write('command_request', {
                command: cmd,
                origin: { type: 'player', uuid: requestId, request_id: requestId },
                internal: true,
                version: 52
            });
        } catch (err) {
            console.error(`Failed to send command: ${err.message}`);
        }
    });
}

// Function to spawn bot with improved anti-cheat features
async function spawnBot(realm, logFunction) {
    const authFlow = new Authflow(config.username, './accounts', {
        authTitle: Titles.MinecraftNintendoSwitch,
        deviceType: "Nintendo",
        flow: "live"
    });

    const client = bedrock.createClient({
        username: config.username,
        profilesFolder: './accounts',
        realms: { realmInvite: realm.realmCode },
        conLog: logFunction
    });

    realmClients.set(realm.realmCode, client);
    const auth = await authFlow.getXboxToken();

    client.on('join', () => {
        logFunction(`Joined ${realm.realmName} as ${client.username}`);
    });

    client.on('player_list', packet => {
        packet.records.records.forEach(async player => {
            if (packet.records.type === 'add') {
                const os = devices[player.build_platform];
                logFunction(`${player.username} joined on ${os}`);
                enhanceAntiCheat(client, player, os);
            }
        });
    });

    client.on('text', packet => {
        if (!packet.needs_translation && packet.type === 'chat') {
            sendEmbed(false, `**${packet.source_name}**: ${packet.message}`, 'Grey', realm.logChannels.chat);
            logFunction(`Relayed message from ${realm.realmName} to Discord >> ${packet.source_name}: ${packet.message}`);
        }
    });

    client.on('spawn', () => {
        logFunction(`Bot spawned on ${realm.realmName}`);
        sendEmbed(`Bot connected`, `Successfully connected to ${realm.realmName}`, 'Blue', realm.logChannels.chat);
    });

    client.on('error', e => {
        logFunction(`Bot encountered an error on ${realm.realmName} >> ${e.message}, reconnecting...`);
    });

    client.on('kick', e => {
        const reason = e.reason || 'Unknown reason';
        logFunction(`Bot was kicked on ${realm.realmName} >> Reason: ${reason}, reconnecting...`);
    });
}

module.exports = { sendCmd, spawnBot };
