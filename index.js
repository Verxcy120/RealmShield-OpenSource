const discord = require('discord.js'),
    fs = require('fs'),
    config = require('./config.json'),
    client = new discord.Client({ intents: ["GuildMessages", "Guilds", "MessageContent", discord.GatewayIntentBits.MessageContent, discord.GatewayIntentBits.Guilds] }),
    commands = new Map()
require('colors')

// fs.readdirSync('./commands').forEach((file) => { 
//     if (file.endsWith('.js')) {
//         const cmd = require(`./commands/${file.split('.js').shift()}`)
//         commands.set(cmd.data.name, cmd)
//     }
// })               Will be available in future versions





function log(...text) {
    console.log(new Date().toLocaleString().red, ` |  ${text.join(' ')}`)
}

async function sendEmbed(title, description, colour, channelId) {
    const embed = new discord.EmbedBuilder()
    if (title) embed.setAuthor({ name: client.user.displayName, iconURL: client.user.avatarURL({ size: 32 }) })
    if (title) embed.setTitle(title)
    embed.setDescription(description)
    embed.setColor(colour)
    if (title) embed.setTimestamp()


    const channel = await client.channels.fetch(channelId)
    await channel.send({
        embeds: [embed]
    })
    return
}


client.on('ready', (client) => {
    log(`Logged in as ${client.user.username}!`)
    log('Connecting to realms...')
    const realms = require('./realm')

    config.realms.forEach((realm) => {
        realms.spawnBot(realm)
    })
})

client.on('messageCreate', (message) => {
    const realms = require('./realm')
    const { content, author: user } = message
    if (user.bot) return
    const config = JSON.parse(fs.readFileSync('./config.json', 'utf-8'))

    if (content.startsWith(';')) {
        if (!config.admins.includes(user.id)) return
        realms.relayCommand(message)
    } else {
        realms.relayMessage(message)
    }
})

client.login(config.botToken)

module.exports = { client, log, sendEmbed }
