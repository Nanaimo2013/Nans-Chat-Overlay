// Configuration
const config = {
    messageDuration: 10,
    maxMessages: 5,
    showBadges: true,
    showEmotes: true,
    theme: 'dark',
    animation: 'slide',
    channel: 'krish_tv'
};

// DOM Elements
const chatContainer = document.getElementById('chat');
const settingsPanel = document.querySelector('.settings-panel');
const settingsToggle = document.querySelector('.settings-toggle');
const closeSettings = document.querySelector('.close-settings');
const themeButtons = document.querySelectorAll('.theme-btn');

// Settings Elements
const messageDurationInput = document.getElementById('messageDuration');
const maxMessagesInput = document.getElementById('maxMessages');
const showBadgesInput = document.getElementById('showBadges');
const showEmotesInput = document.getElementById('showEmotes');
const messageAnimationSelect = document.getElementById('messageAnimation');

// Initialize WebSocket connection
let ws;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;

function connectToTwitch() {
    const channel = new URLSearchParams(window.location.search).get('channel') || config.channel;
    const token = new URLSearchParams(window.location.search).get('token') || 'your_new_twitch_oauth_token';
    
    ws = new WebSocket('wss://irc-ws.chat.twitch.tv:443');
    
    ws.onopen = () => {
        console.log('Connected to Twitch');
        ws.send('PASS ' + token);
        ws.send('NICK Nanaimo_2013');
        ws.send('JOIN #' + channel);
        reconnectAttempts = 0;
        
        // Add connection success animation
        const header = document.querySelector('.channel-header');
        header.classList.add('animate__animated', 'animate__pulse');
        setTimeout(() => {
            header.classList.remove('animate__animated', 'animate__pulse');
        }, 1000);
    };
    
    ws.onmessage = (event) => {
        const message = event.data.trim();
        
        if (message.startsWith('PING')) {
            ws.send('PONG :tmi.twitch.tv');
            return;
        }
        
        if (message.includes('PRIVMSG')) {
            handleChatMessage(message);
        }
    };
    
    ws.onclose = () => {
        console.log('Disconnected from Twitch');
        if (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            setTimeout(connectToTwitch, 5000 * reconnectAttempts);
        }
    };
    
    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };
}

function handleChatMessage(message) {
    const match = message.match(/:(.*?)!(.*?) PRIVMSG #(.*?) :(.*)/);
    if (!match) return;
    
    const [, username, , channel, content] = match;
    const badges = parseBadges(message);
    const emotes = parseEmotes(message);
    
    const messageElement = createMessageElement(username, content, badges, emotes);
    addMessage(messageElement);
}

function parseBadges(message) {
    const badgesMatch = message.match(/@badges=(.*?);/);
    if (!badgesMatch) return [];
    
    const badgesString = badgesMatch[1];
    if (!badgesString) return [];
    
    return badgesString.split(',').map(badge => {
        const [name, version] = badge.split('/');
        return { name, version };
    });
}

function parseEmotes(message) {
    const emotesMatch = message.match(/@emotes=(.*?);/);
    if (!emotesMatch) return [];
    
    const emotesString = emotesMatch[1];
    if (!emotesString) return [];
    
    return emotesString.split('/').map(emote => {
        const [id, positions] = emote.split(':');
        const [start, end] = positions.split(',')[0].split('-');
        return { id, start, end };
    });
}

function createMessageElement(username, content, badges, emotes) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message';
    
    // Add animation class based on selected animation
    messageDiv.classList.add(`animate-${config.animation}`);
    
    if (config.theme === 'light') messageDiv.classList.add('light-theme');
    
    const usernameSpan = document.createElement('span');
    usernameSpan.className = 'username';
    usernameSpan.textContent = username;
    
    const contentSpan = document.createElement('span');
    contentSpan.className = 'message-content';
    
    let messageContent = content;
    
    if (config.showBadges) {
        badges.forEach(badge => {
            const badgeImg = document.createElement('img');
            badgeImg.className = 'badge';
            badgeImg.src = `https://static-cdn.jtvnw.net/badges/v1/${badge.name}/${badge.version}`;
            messageDiv.insertBefore(badgeImg, contentSpan);
        });
    }
    
    if (config.showEmotes) {
        emotes.forEach(emote => {
            const emoteImg = document.createElement('img');
            emoteImg.className = 'emote';
            emoteImg.src = `https://static-cdn.jtvnw.net/emotes/${emote.id}/3.0`;
            messageContent = messageContent.replace(
                content.substring(emote.start, parseInt(emote.end) + 1),
                emoteImg.outerHTML
            );
        });
    }
    
    contentSpan.innerHTML = messageContent;
    
    messageDiv.appendChild(usernameSpan);
    messageDiv.appendChild(contentSpan);
    
    return messageDiv;
}

function addMessage(messageElement) {
    chatContainer.insertBefore(messageElement, chatContainer.firstChild);
    
    // Remove old messages if we exceed maxMessages
    while (chatContainer.children.length > config.maxMessages) {
        chatContainer.removeChild(chatContainer.lastChild);
    }
    
    // Remove message after duration
    setTimeout(() => {
        messageElement.style.animation = 'fadeOut 0.3s ease-out';
        setTimeout(() => messageElement.remove(), 300);
    }, config.messageDuration * 1000);
}

// Settings Panel
settingsToggle.addEventListener('click', () => {
    settingsPanel.style.display = 'block';
    updateSettingsInputs();
});

closeSettings.addEventListener('click', () => {
    settingsPanel.style.display = 'none';
});

function updateSettingsInputs() {
    messageDurationInput.value = config.messageDuration;
    maxMessagesInput.value = config.maxMessages;
    showBadgesInput.checked = config.showBadges;
    showEmotesInput.checked = config.showEmotes;
    messageAnimationSelect.value = config.animation;
}

// Settings Change Handlers
messageDurationInput.addEventListener('change', (e) => {
    config.messageDuration = parseInt(e.target.value);
});

maxMessagesInput.addEventListener('change', (e) => {
    config.maxMessages = parseInt(e.target.value);
});

showBadgesInput.addEventListener('change', (e) => {
    config.showBadges = e.target.checked;
});

showEmotesInput.addEventListener('change', (e) => {
    config.showEmotes = e.target.checked;
});

messageAnimationSelect.addEventListener('change', (e) => {
    config.animation = e.target.value;
});

// Theme Switching
themeButtons.forEach(button => {
    button.addEventListener('click', () => {
        const theme = button.dataset.theme;
        config.theme = theme;
        document.body.className = theme;
        document.querySelectorAll('.chat-message').forEach(msg => {
            msg.classList.toggle('light-theme', theme === 'light');
        });
        settingsPanel.classList.toggle('light-theme', theme === 'light');
        
        // Add theme switch animation
        button.classList.add('animate__animated', 'animate__pulse');
        setTimeout(() => {
            button.classList.remove('animate__animated', 'animate__pulse');
        }, 500);
    });
});

// Initialize
connectToTwitch();
