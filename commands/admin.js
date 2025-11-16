const fs = require('fs');
const config = require('../config');

function loadQueue() {
    try { return JSON.parse(fs.readFileSync(config.REQUEST_FILE)); }
    catch { return []; }
}
function saveQueue(queue) { fs.writeFileSync(config.REQUEST_FILE, JSON.stringify(queue,null,2)); }

module.exports = {
    name: "admin",
    commands: {
        clearqueue: (user, platform) => {
            if(!config.ADMINS[platform]?.includes(user)) return "❌ Not authorized";
            saveQueue([]);
            return "🗑 Queue cleared";
        },
        remove: (user, platform, index) => {
            if(!config.ADMINS[platform]?.includes(user)) return "❌ Not authorized";
            const queue = loadQueue();
            if(index<1||index>queue.length) return "Invalid index";
            const removed = queue.splice(index-1,1)[0];
            saveQueue(queue);
            return `🗑 Removed "${removed.track.name}"`;
        },
        ban: (user, platform, target) => {
            if(!config.ADMINS[platform]?.includes(user)) return "❌ Not authorized";
            if(!config.BANNED_USERS[platform]) config.BANNED_USERS[platform]=[];
            config.BANNED_USERS[platform].push(target);
            return `⛔ ${target} banned.`;
        },
        unban: (user, platform, target) => {
            if(!config.ADMINS[platform]?.includes(user)) return "❌ Not authorized";
            config.BANNED_USERS[platform] = (config.BANNED_USERS[platform]||[]).filter(u=>u!==target);
            return `✅ ${target} unbanned.`;
        },
        pause: (user, platform, spotify) => {
            if(!config.ADMINS[platform]?.includes(user)) return "❌ Not authorized";
            spotify.pause();
            return "⏸ Playback paused";
        },
        resume: (user, platform, spotify) => {
            if(!config.ADMINS[platform]?.includes(user)) return "❌ Not authorized";
            spotify.play();
            return "▶️ Playback resumed";
        },
        volume: (user, platform, spotify, level) => {
            if(!config.ADMINS[platform]?.includes(user)) return "❌ Not authorized";
            spotify.setVolume(level);
            return `🔊 Volume set to ${level}%`;
        },
        setdevice: (user, platform, spotify, deviceName) => {
            if(!config.ADMINS[platform]?.includes(user)) return "❌ Not authorized";
            spotify.transferMyPlayback([deviceName]);
            return `🎛 Playback switched to ${deviceName}`;
        }
    }
};
