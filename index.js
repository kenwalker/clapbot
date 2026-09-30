const path = require("path");
const { Client, Events, GatewayIntentBits } = require("discord.js");
const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    entersState,
    AudioPlayerStatus,
    VoiceConnectionStatus,
} = require("@discordjs/voice");

// Point @discordjs/voice at the bundled ffmpeg binary so no system install is needed.
process.env.FFMPEG_PATH = require("ffmpeg-static");

var totalMessages = 0;
var clapSounds = [ "applause-01 2.mp3", "applause-01.mp3", "applause-2 2.mp3", "applause-2.mp3", "applause-4 2.mp3", "applause-4.mp3", "applause3 2.mp3", "applause3.mp3", "applause4 2.mp3", "applause4.mp3", "applause6 2.mp3", "applause6.mp3", "applause7 2.mp3", "applause7.mp3", "applause8.mp3", "applause10.mp3", "Audience.mp3"];
var lastClaps = {};

const CLAPS_BEFORE_SLEEP = 3;
const SLEEP_MS = 60 * 1000 * 2;
const REPLY_TTL_MS = 4000;

const config = require("./config.json");
// config.token contains the bot's token.
// config.prefix contains the message prefix.
// config.app contains the app name that is triggered after the prefix.

// MessageContent is a privileged intent: it must also be enabled for the bot
// in the Discord Developer Portal (Bot -> Privileged Gateway Intents).
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent,
    ],
});

function setStatus() {
    client.user.setActivity('!' + config.app + ' (' + client.guilds.cache.size + ' servers)');
}

// Reply to a command and remove the reply again shortly after.
function replyAndForget(message, text) {
    message.reply(text).then(function (reply) {
        setTimeout(function () {
            reply.delete().catch(function () {});
        }, REPLY_TTL_MS);
    }).catch(err => console.log("reply failed:", err.message));
}

async function clap(voiceChannel) {
    const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    });

    try {
        await entersState(connection, VoiceConnectionStatus.Ready, 20 * 1000);

        var randomClap = Math.floor(Math.random() * clapSounds.length);
        const player = createAudioPlayer();
        const resource = createAudioResource(path.join(__dirname, clapSounds[randomClap]));

        connection.subscribe(player);
        player.play(resource);

        await entersState(player, AudioPlayerStatus.Playing, 10 * 1000);
        await entersState(player, AudioPlayerStatus.Idle, 60 * 1000);
    } catch (err) {
        console.log("clap failed:", err);
    } finally {
        if (connection.state.status !== VoiceConnectionStatus.Destroyed) {
            connection.destroy();
        }
    }
}

client.once(Events.ClientReady, () => {
    setStatus();
    console.log("Ready");
});

client.on(Events.GuildCreate, setStatus);

//removed from a server
client.on(Events.GuildDelete, setStatus);

client.on(Events.MessageCreate, async message => {
    // This event will run on every single message received, from any channel or DM.

    // It's good practice to ignore other bots. This also makes your bot ignore itself
    // and not get into a spam loop (we call that "botception").
    if (message.author.bot) return;
    if (!message.guild) return;

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
    message.delete().catch(function () {});

    var voiceChannel = message.member && message.member.voice.channel;
    if (!voiceChannel) {
        replyAndForget(message, "You are not on an active voice channel, CLAP amongst yourself");
        return;
    }

    if (voiceChannel.name.toLowerCase().indexOf("quiet") !== -1) {
        replyAndForget(message, "No CLAPPING in quiet channels!");
        return;
    }

    // Per-channel budget: CLAPS_BEFORE_SLEEP claps, then the hands rest for SLEEP_MS.
    // Negative values count remaining claps; a positive value is the timestamp of when sleep began.
    if (!lastClaps[voiceChannel.name]) {
        lastClaps[voiceChannel.name] = -CLAPS_BEFORE_SLEEP;
    }
    if (lastClaps[voiceChannel.name] > 0) {
        if (Date.now() - lastClaps[voiceChannel.name] < SLEEP_MS) {
            replyAndForget(message, "Recent clap in " + voiceChannel.name + ", the hands are sore...");
            return;
        }
        lastClaps[voiceChannel.name] = -CLAPS_BEFORE_SLEEP;
    }

    lastClaps[voiceChannel.name]++;
    if (lastClaps[voiceChannel.name] === 0) {
        lastClaps[voiceChannel.name] = Date.now();
    }

    await clap(voiceChannel);
});

client.login(config.token).catch(err => {
    console.error("Login failed:", err.message);
    process.exit(1);
});

