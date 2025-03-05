require("dotenv").config();
const WebSocket = require("ws");

const twitchWS = new WebSocket("wss://irc-ws.chat.twitch.tv:443");
const overlayWS = new WebSocket.Server({ port: process.env.PORT || 8080 });

const TWITCH_USERNAME = process.env.TWITCH_USERNAME;
const TWITCH_OAUTH_TOKEN = process.env.TWITCH_OAUTH_TOKEN;
const TWITCH_CHANNEL = process.env.TWITCH_CHANNEL;

twitchWS.on("open", () => {
    console.log("✅ Connected to Twitch Chat!");
    twitchWS.send(`PASS oauth:${TWITCH_OAUTH_TOKEN}`);
    twitchWS.send(`NICK ${TWITCH_USERNAME}`);
    twitchWS.send(`JOIN #${TWITCH_CHANNEL}`);
});

twitchWS.on("message", (data) => {
    const message = data.toString();
    if (message.includes("PRIVMSG")) {
        const username = message.split("!")[0].substring(1);
        const chatMessage = message.split(`PRIVMSG #${TWITCH_CHANNEL} :`)[1];

        overlayWS.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ username, message: chatMessage }));
            }
        });
    }
});

overlayWS.on("connection", (ws) => console.log("🔗 Overlay connected!"));
