// updated-music-bot.js
// Combined fixes for request handling, spotify error handling, and overlay robustness.

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const WebSocket = require('ws');
const SpotifyWebApi = require('spotify-web-api-node');
const tmi = require('tmi.js');
const { google } = require('googleapis');
const express = require('express');
const config = require('./config.js');

let requestQueue = [];
let currentSong = { value: null };
let voteSkipUsers = new Set();
let activeDeviceId = null;
let userRequestCount = {};
let userCooldowns = {};
let seenMessages = { twitch: new Set(), youtube: new Set(), tiktok: new Set(), console: new Set() };

// Timer to auto-advance when a track ends
let trackEndTimer = null;

// ------------------ Persistence ------------------
try {
  if (fs.existsSync(config.REQUEST_FILE)) {
    const data = JSON.parse(fs.readFileSync(config.REQUEST_FILE, 'utf8'));
    requestQueue = Array.isArray(data) ? data : [];
  } else {
    requestQueue = [];
  }
} catch (err) {
  console.log("No saved request file or parse error, starting with empty queue.");
  requestQueue = [];
}

// ------------------ Command modules loader ------------------
const commands = {};
try {
  const cmdsDir = path.join(__dirname, 'commands');
  if (fs.existsSync(cmdsDir)) {
    const commandFiles = fs.readdirSync(cmdsDir).filter(f => f.endsWith('.js'));
    for (const file of commandFiles) {
      try {
        const cmdModule = require(`./commands/${file}`);
        if (cmdModule.name && cmdModule.commands) {
          commands[cmdModule.name] = cmdModule.commands;
        } else {
          console.log(`⚠️ Invalid command file: ${file}`);
        }
      } catch (e) {
        console.log(`Failed to load command file ${file}:`, e.message || e);
      }
    }
  }
} catch (err) {
  console.log("Error loading commands folder:", err.message || err);
}

// ------------------ Express overlay ------------------
const app = express();
const OVERLAY_PORT = config.OVERLAY_PORT || 8080;

const overlayPath = path.join(__dirname, 'overlay');
if (fs.existsSync(overlayPath)) {
  app.use('/', express.static(overlayPath));
} else {
  app.use('/', (req, res) => res.send('Overlay folder missing'));
}

app.listen(OVERLAY_PORT, () => {
  console.log(`🎧 Overlay server running on http://localhost:${OVERLAY_PORT}`);
});

// ------------------ WebSocket server ------------------
const wss = new WebSocket.Server({ port: OVERLAY_PORT + 1 });
let clients = [];
wss.on('connection', ws => {
  clients.push(ws);
  ws.on('close', () => clients = clients.filter(c => c !== ws));
});
function updateOverlay() {
  const data = JSON.stringify({ currentSong: currentSong.value, queue: requestQueue, votes: voteSkipUsers.size });
  clients.forEach(ws => { if (ws.readyState === 1) ws.send(data); });
}

// ------------------ Spotify setup ------------------
let token;
try {
  token = JSON.parse(fs.readFileSync('token.json', 'utf8'));
} catch (err) {
  console.error("token.json missing or unreadable. Run auth.js first. Exiting.");
  process.exit(1);
}

const spotify = new SpotifyWebApi({
  clientId: config.SPOTIFY.CLIENT_ID,
  clientSecret: config.SPOTIFY.CLIENT_SECRET,
  redirectUri: config.SPOTIFY.REDIRECT_URI,
  refreshToken: token.refresh_token
});

async function refreshSpotify() {
  try {
    const data = await spotify.refreshAccessToken();
    spotify.setAccessToken(data.body.access_token);
    return true;
  } catch (e) {
    console.error("Failed to refresh Spotify token:", e.message || e);
    return false;
  }
}

async function getActiveDevice() {
  try {
    const ok = await refreshSpotify();
    if (!ok) return null;

    const devices = await spotify.getMyDevices();
    if (!devices.body || !Array.isArray(devices.body.devices) || devices.body.devices.length === 0) {
      console.log("No Spotify devices found. Make sure Spotify is running and at least one device is available.");
      return null;
    }
    const active = devices.body.devices.find(d => d.is_active) || devices.body.devices[0];
    console.log(`Using Spotify device: ${active.name} (${active.id})`);
    return active.id;
  } catch (e) {
    console.error("Error getting Spotify devices:", e.message || e);
    return null;
  }
}

async function fetchTrackDurationIfMissing(track) {
  // track from search usually has duration_ms, but be defensive
  try {
    if (track && (track.duration_ms || track.duration_ms === 0)) return track.duration_ms;
    if (!track || !track.id) return 0;
    const res = await spotify.getTrack(track.id);
    return res.body?.duration_ms || 0;
  } catch (e) {
    console.warn("Could not fetch track duration:", e.message || e);
    return 0;
  }
}

async function searchTrack(query) {
  try {
    const ok = await refreshSpotify();
    if (!ok) return null;
    const res = await spotify.searchTracks(query, { limit: 1 });
    if (!res || !res.body || !res.body.tracks) return null;
    return res.body.tracks.items[0] || null;
  } catch (e) {
    console.error("Search error:", e.message || e);
    return null;
  }
}

// ------------------ Music playback (robust) ------------------
async function playNext(auto = false) {
  // clear any existing end-timer to avoid double triggers
  if (trackEndTimer) {
    clearTimeout(trackEndTimer);
    trackEndTimer = null;
  }

  if (!requestQueue.length) {
    currentSong.value = null;
    updateOverlay();
    if (!auto) console.log("Queue empty");
    return;
  }

  const next = requestQueue.shift();
  currentSong.value = next;
  voteSkipUsers.clear();

  // ensure device
  if (!activeDeviceId) activeDeviceId = await getActiveDevice();
  if (!activeDeviceId) {
    console.log("No active Spotify device available; re-queueing the track and aborting play.");
    requestQueue.unshift(next);
    currentSong.value = null;
    saveQueue();
    updateOverlay();
    return;
  }

  try {
    await refreshSpotify();
    // play by URI; spotify.play accepts { device_id, uris }
    await spotify.play({ device_id: activeDeviceId, uris: [next.track.uri] });
    console.log(`🎶 Now playing: ${next.track.name} (requested by ${next.requestedBy})`);
  } catch (e) {
    console.error("Spotify play error:", e.message || e);
    // put track back to queue front so we don't lose it
    requestQueue.unshift(next);
    currentSong.value = null;
    saveQueue();
    updateOverlay();
    // try next after a short delay to avoid rapid repeats
    setTimeout(() => playNext(true), 1500);
    return;
  }

  // Save queue state and update overlay
  saveQueue();
  updateOverlay();

  // set up auto-advance timer using duration_ms (defensive: fetch if missing)
  try {
    let durationMs = next.track.duration_ms;
    if (!durationMs && next.track.id) {
      durationMs = await fetchTrackDurationIfMissing(next.track);
    }
    durationMs = Number(durationMs) || 0;

    if (durationMs > 0) {
      // Add a small buffer to ensure Spotify finished switching
      trackEndTimer = setTimeout(() => {
        trackEndTimer = null;
        currentSong.value = null;
        // ensure overlay shows ended state before next starts
        updateOverlay();
        playNext(true).catch(err => console.error("playNext after timer failed:", err));
      }, durationMs + 800); // 800ms buffer
    } else {
      // If we don't have duration, fall back to polling playback state after a safe default
      const fallback = 30 * 1000; // 30s fallback
      console.warn("Track duration unknown, using fallback timer of", fallback, "ms");
      trackEndTimer = setTimeout(() => {
        trackEndTimer = null;
        currentSong.value = null;
        updateOverlay();
        playNext(true).catch(err => console.error("playNext after fallback timer failed:", err));
      }, fallback);
    }
  } catch (e) {
    console.warn("Error setting track timer:", e.message || e);
  }
}

// ------------------ Queue handling ------------------
function saveQueue() {
  try {
    fs.writeFileSync(config.REQUEST_FILE, JSON.stringify(requestQueue, null, 2), 'utf8');
  } catch (e) {
    console.error("Failed to save queue:", e.message || e);
  }
}

// ------------------ Command handler ------------------
async function handleCommand(platform, user, message) {
  try {
    if (!message || typeof message !== 'string') return;
    if (!message.startsWith(config.REQUEST_PREFIX)) return;

    const args = message.slice(config.REQUEST_PREFIX.length).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();

    if (cmd === "request") {
      const query = args.join(" ").trim();
      if (!query) {
        console.log(`[${platform}] ${user} tried to request without query.`);
        return;
      }
      return requestSong(platform, user, query);
    }

    // external commands
    for (const mod in commands) {
      if (commands[mod][cmd]) {
        try {
          const result = await commands[mod][cmd](user, platform, args, { currentSong, playNext, requestQueue, commands });
          if (result) console.log(result);
          return;
        } catch (err) {
          console.error(`Error executing command [${cmd}] from module [${mod}]:`, err);
        }
      }
    }

    console.log(`[${platform}] Unknown command: ${cmd}`);
  } catch (e) {
    console.error("handleCommand error:", e.message || e);
  }
}

async function requestSong(platform, user, query) {
  try {
    const normalizedUser = String(user || 'unknown').trim();
    const id = `${platform}:${normalizedUser}:${query}`;

    if (!seenMessages[platform]) seenMessages[platform] = new Set();
    if (seenMessages[platform].has(id)) {
      console.log(`[${platform}] Duplicate request ignored for ${normalizedUser}: "${query}"`);
      return;
    }
    seenMessages[platform].add(id);
    setTimeout(() => seenMessages[platform].delete(id), 3000); // expire after 3s

    console.log(`[${platform}] Request received from ${normalizedUser}: "${query}"`);

    const isAdmin = Array.isArray(config.ADMINS?.[platform]) && config.ADMINS[platform].includes(normalizedUser);
    if (!isAdmin) {
      if (Array.isArray(config.BANNED_USERS?.[platform]) && config.BANNED_USERS[platform].includes(normalizedUser)) {
        console.log(`[${platform}] ${normalizedUser} is banned from requesting.`);
        return;
      }

      const userKey = `${platform}:${normalizedUser}`;
      if (!userRequestCount[userKey]) userRequestCount[userKey] = 0;
      if (userRequestCount[userKey] >= (config.MAX_REQUESTS_PER_USER || 3)) {
        console.log(`[${platform}] ${normalizedUser} reached max requests`);
        return;
      }

      const now = Date.now();
      if (userCooldowns[userKey] && now - userCooldowns[userKey] < (config.COOLDOWN_SECONDS || 30) * 1000) {
        console.log(`[${platform}] ${normalizedUser} on cooldown`);
        return;
      }
    }

    const track = await searchTrack(query);
    if (!track) {
      console.log(`[${platform}] Song not found for ${normalizedUser}: "${query}"`);
      return;
    }

    requestQueue.push({ track, requestedBy: normalizedUser, requestedAt: Date.now() });

    if (!isAdmin) {
      const userKey = `${platform}:${normalizedUser}`;
      userRequestCount[userKey] = (userRequestCount[userKey] || 0) + 1;
      userCooldowns[userKey] = Date.now();
    }

    saveQueue();
    console.log(`[Queue] ${normalizedUser} added: ${track.name} - ${track.artists?.map(a => a.name).join(', ')}`);

    // If nothing playing, start playback
    if (!currentSong.value) {
      await playNext();
    } else {
      updateOverlay();
    }
  } catch (e) {
    console.error("requestSong fatal error:", e.message || e);
  }
}

// ------------------ Console commands ------------------
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.on('line', async line => handleCommand("console", "console", line.trim()));

// ------------------ Auto play check (keeps queue moving if something else sets currentSong null) ------------------
setInterval(() => { if (!currentSong.value && requestQueue.length) playNext(true).catch(err => console.error("Auto playNext error:", err)); }, 4000);

// ------------------ Twitch ------------------
if (Array.isArray(config.STREAMING_PLATFORMS) && config.STREAMING_PLATFORMS.includes('twitch')) {
  try {
    const twitchClient = new tmi.Client({ channels: [config.TWITCH_CHANNEL] });
    twitchClient.connect();
    twitchClient.on('connected', (addr, port) => console.log(`📡 Twitch connected (${addr}:${port})`));
    twitchClient.on('message', (channel, tags, message, self) => {
      if (self || !message) return;
      const display = tags['display-name'] || tags['username'] || 'unknown';
      handleCommand("twitch", display, message);
    });
    console.log("📡 Twitch connection initialized");
  } catch (e) {
    console.error("Twitch init error:", e.message || e);
  }
}

// ------------------ TikTok (normalized) ------------------
if (Array.isArray(config.STREAMING_PLATFORMS) && config.STREAMING_PLATFORMS.includes('tiktok')) {
  try {
    const TikTokConnector = require('./platforms/tiktok');
    if (!global._tiktokInitialized) {
      TikTokConnector({ username: config.TIKTOK.USERNAME }, (user, msg) => {
        if (!msg) return;

        // Normalize TikTok messages to string
        let text = msg;
        if (typeof msg === "object") {
          text =
            msg.comment ||
            msg.text ||
            msg.content ||
            msg.message ||
            msg.data?.comment ||
            msg.data?.text ||
            msg.rawMessage ||
            msg.raw?.comment ||
            null;
        }

        if (!text || typeof text !== "string") {
          console.log("⚠️ TikTok: Unknown message format (ignoring). Raw:", msg);
          return;
        }

        handleCommand("tiktok", user, text.trim());
      });
      console.log("📡 TikTok connected");
      global._tiktokInitialized = true;
    }
  } catch (e) {
    console.log("TikTok error:", e.message || e);
  }
}

// ------------------ YouTube ------------------
if (Array.isArray(config.STREAMING_PLATFORMS) && config.STREAMING_PLATFORMS.includes('youtube')) {
  try {
    const youtube = google.youtube({ version: 'v3', auth: config.YOUTUBE_API_KEY });
    let lastYouTubeMessageId = null;

    async function pollYouTube(liveChatId) {
      try {
        const res = await youtube.liveChatMessages.list({ liveChatId, part: 'snippet,authorDetails', maxResults: 50 });
        if (res.data.items && res.data.items.length) {
          for (let i = res.data.items.length - 1; i >= 0; i--) {
            const item = res.data.items[i];
            if (item.id === lastYouTubeMessageId) break;
            const user = item.authorDetails?.displayName || item.authorDetails?.channelId || 'unknown';
            const msg = item.snippet?.displayMessage;
            if (!msg) continue;
            handleCommand("youtube", user, msg);
          }
          lastYouTubeMessageId = res.data.items[0].id;
        }
      } catch (err) {
        console.error("YouTube poll error:", err.message || err);
      }
      setTimeout(() => pollYouTube(liveChatId), 5000);
    }

    if (config.YOUTUBE_LIVECHAT_ID) {
      pollYouTube(config.YOUTUBE_LIVECHAT_ID);
      console.log("📡 YouTube LiveChat polling active");
    } else {
      console.log("YouTube LiveChat ID not configured - skipping YouTube polling");
    }
  } catch (e) {
    console.error("YouTube init error:", e.message || e);
  }
}

console.log(`🎧 Multi-platform bot started! Overlay: http://localhost:${OVERLAY_PORT}`);
