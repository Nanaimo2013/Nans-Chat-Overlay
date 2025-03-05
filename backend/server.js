require("dotenv").config();
const express = require('express');
const WebSocket = require("ws");
const cors = require('cors');
const app = express();
const port = process.env.PORT || 8080;

// Enable CORS
app.use(cors());

// Serve static files from the frontend directory
app.use(express.static('../frontend'));

// Create WebSocket server
const wss = new WebSocket.Server({ port: 8081 });

// Store connected clients
const clients = new Set();

// Twitch WebSocket connection
let twitchWS;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;

function connectToTwitch() {
    twitchWS = new WebSocket('wss://irc-ws.chat.twitch.tv:443');
    
    twitchWS.on('open', () => {
        console.log('Connected to Twitch');
        twitchWS.send(`PASS oauth:${process.env.TWITCH_OAUTH_TOKEN}`);
        twitchWS.send(`NICK ${process.env.TWITCH_USERNAME}`);
        twitchWS.send(`JOIN #${process.env.TWITCH_CHANNEL}`);
        reconnectAttempts = 0;
    });
    
    twitchWS.on('message', (data) => {
        const message = data.toString();
        
        if (message.startsWith('PING')) {
            twitchWS.send('PONG :tmi.twitch.tv');
            return;
        }
        
        if (message.includes('PRIVMSG')) {
            // Broadcast message to all connected clients
            const messageData = {
                type: 'chat',
                data: message
            };
            
            clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(messageData));
                }
            });
        }
    });
    
    twitchWS.on('close', () => {
        console.log('Disconnected from Twitch');
        if (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            setTimeout(connectToTwitch, 5000 * reconnectAttempts);
        }
    });
    
    twitchWS.on('error', (error) => {
        console.error('Twitch WebSocket error:', error);
    });
}

// Handle WebSocket connections from clients
wss.on('connection', (ws) => {
    console.log('Client connected');
    clients.add(ws);
    
    ws.on('close', () => {
        console.log('Client disconnected');
        clients.delete(ws);
    });
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    connectToTwitch();
});
