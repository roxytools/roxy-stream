# THIS IS in BETA please expect issues!
# Roxy Stream Tool 

🎵 Multi-platform music bot with Twitch, YouTube, TikTok support, Spotify integration, and a modern OBS overlay (soon).

---

## **Features**

- Request songs via `!request <song>` across Twitch, YouTube, and TikTok.
- Vote to skip songs (`!voteSkip`) and skip immediately (`!skip` for admins).
- Shuffle, repeat, and move songs in the queue.
- Fun commands: `!roll`, `!flip`, `!8ball`, `!joke`, `!say` (TTS), `!meme`.
- Info commands: `!help`, `!stats`, `!uptime`, `!nowplaying`, `!queuecount`.
- Overlay compatible with OBS, fully transparent and responsive.
- Admin controls: `!remove`, `!clearqueue`, `!pause`, `!resume`, `!volume`, `!ban`, `!unban`, `!setdevice`.

---

## **Installation**

1. Clone the repo:
   ```bash
   git clone https://github.com/yourusername/streamtool
   cd streamtool

2. Run npm install

3. Create a config.js in the root directory with the following
module.exports = {
  REQUEST_PREFIX: "!",
  REQUEST_FILE: "./data/requests.json",
  OVERLAY_PORT: 8080,
  COOLDOWN_SECONDS: 30,
  MAX_REQUESTS_PER_USER: 3,
  VOTE_THRESHOLD: 3,

  STREAMING_PLATFORMS: ["twitch","youtube","tiktok"],

  TWITCH_CHANNEL: "yourTwitchChannel",
  TIKTOK: { USERNAME: "yourTikTokUsername" },
  YOUTUBE_LIVECHAT_ID: "yourYouTubeLiveChatId",

  SPOTIFY: {
    CLIENT_ID: process.env.SPOTIFY_CLIENT_ID,
    CLIENT_SECRET: process.env.SPOTIFY_CLIENT_SECRET,
    REDIRECT_URI: process.env.SPOTIFY_REDIRECT_URI
  },

  ADMINS: {
    twitch: ["yourTwitchName"],
    youtube: ["yourYouTubeName"],
    tiktok: ["yourTikTokName"]
  },

  BANNED_USERS: {
    twitch: [],
    youtube: [],
    tiktok: []
  }
};

4. Run node auth.js to authenticate Spotify

5. Open chatid.js and change the youtube video link and the api key, then run node chatid.js

6. Run node app.js to start.
Use commands in Twitch, YouTube Live Chat, or TikTok chat.

You are allowed to make custom commands be sure to add them to the commands folder and please share them with the community.
This project is licensed under the MIT License - see the LICENSE file for details.
