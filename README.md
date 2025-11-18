# Roxy Stream Tool 
 THIS IS in BETA please expect issues, and tiktok does **NOT** work currently.

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
   git clone https://github.com/roxytools/roxy-stream
   cd streamtool

2. Run
   ```bash
   npm install

3. Edit the example config.js and fill in **ALL** your details to ensure it works properly.

4. Run node auth.js to authenticate Spotify

5. Open chatid.js and change the youtube video link and the api key, then run node chatid.js

6. Run node startup.js to start.
Use commands in Twitch, YouTube Live Chat, or TikTok chat.

You are allowed to make custom commands be sure to add them to the commands folder and please share them with the community.
This project is licensed under the MIT License - see the LICENSE file for details.
