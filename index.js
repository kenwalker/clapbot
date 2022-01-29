const Discord = require("discord.js");
const https = require('https');
var totalMessages = 0;
var clapSounds = [ "applause-01 2.mp3", "applause-01.mp3", "applause-2 2.mp3", "applause-2.mp3", "applause-4 2.mp3", "applause-4.mp3", "applause3 2.mp3", "applause3.mp3", "applause4 2.mp3", "applause4.mp3", "applause6 2.mp3", "applause6.mp3", "applause7 2.mp3", "applause7.mp3", "applause8.mp3", "applause10.mp3", "Audience.mp3", "boos2.mp3", "boos3.mp3"];
var lastClaps = {};

const client = new Discord.Client();

const config = require("./config.json");
// config.token contains the bot's token.
// config.prefix contains the message prefix.
// config.app contains the app name that is triggered after the prefix.

client.on("ready", () => {
    client.user.setActivity('!' + config.app + ' (' + client.guilds.cache.size + ' servers)');
    console.log("Ready");
});

client.on("guildCreate", guild => {
    client.user.setActivity('!' + config.app + ' (' + client.guilds.cache.size + ' servers)');
});

//removed from a server
client.on("guildDelete", guild => {
    client.user.setActivity('!' + config.app + ' (' + client.guilds.cache.size + ' servers)');
});

client.on("message", async message => {
    // This event will run on every single message received, from any channel or DM.

    // It's good practice to ignore other bots. This also makes your bot ignore itself
    // and not get into a spam loop (we call that "botception").
    if (message.author.bot) return;

    // Also good practice to ignore any message that does not start with our prefix, 
    // which is set in the configuration file.
    if (message.content.indexOf(config.prefix) !== 0) {
        return;
    };

    // Here we separate our "command" name, and our "arguments" for the command. 
    // e.g. if we have the message "+say Is this the real life?" , we'll get the following:
    // command = say
    // args = ["Is", "this", "the", "real", "life?"]
    const args = message.content.slice(config.prefix.length).trim().split(/ +/g);
    const clapbot = args.shift().toLowerCase();

    if (clapbot !== config.app) {
        return;
    }
    totalMessages++;
    message.delete({ timeout: 0 });
    var voiceChannel = message.member.voice.channel;
    if (voiceChannel) {
        if (voiceChannel.name.toLowerCase().indexOf("quiet") !== -1) {
            message.reply("No CLAPPING in quiet channels!").then(function (reply) {
                if (!reply.deleted) { reply.delete({ timeout: 4000 }); }
            });
            return;
        }
        if (!lastClaps[voiceChannel.name]) {
            lastClaps[voiceChannel.name] = -3;
        }
        if (lastClaps[voiceChannel.name] > 0 && (Date.now() - lastClaps[voiceChannel.name] < (60 * 1000 * 2))) {
            message.reply("Recent clap in " + voiceChannel.name + ", the hands are sore...").then(function (reply) {
                if (!reply.deleted) { reply.delete({ timeout: 4000 }); }
            });
            return;
        }
        if (lastClaps[voiceChannel.name] > 0 && (Date.now() - lastClaps[voiceChannel.name] > (60 * 1000 * 2))) {
            lastClaps[voiceChannel.name] = -3;
        }

        lastClaps[voiceChannel.name]++;
        if (lastClaps[voiceChannel.name] === 0) {
            lastClaps[voiceChannel.name] = Date.now();
        }
        voiceChannel.join().then(function(connection) {
            var randomClap = Math.floor(Math.random() * Math.floor(clapSounds.length));
            const dispatcher = connection.play(clapSounds[randomClap]);
            dispatcher.on("end", end => {
                voiceChannel.leave();
            });
        }).catch(err => console.log(err));
    } else {
        message.reply("You are not on an active voice channel, CLAP amongst yourself").then(function (reply) {
            if (!reply.deleted) { reply.delete({ timeout: 4000 }); }
        });
    }
});


client.login(config.token);