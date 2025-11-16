const os = require('os');

module.exports = {
    name: "info",
    commands: {
        help: (user, commandsList) => {
            let out = "📖 Commands:\n";
            for (const [moduleName, cmdObj] of Object.entries(commandsList)) {
                out += `\n${moduleName}:\n`;
                for (const cmdName of Object.keys(cmdObj)) {
                    out += ` - ${cmdName}\n`;
                }
            }
            return out;
        },

        ping: () => "🏓 Pong!",

        commands: (user, commandsList) => {
            return Object.keys(commandsList)
                .map(m => Object.keys(commandsList[m]))
                .flat()
                .join(", ");
        },

        stats: (user, platform, requestQueue, voteSkipUsers, userRequestCount) => {
            const totalUsers = Object.keys(userRequestCount).length;
            return `Total songs: ${requestQueue.length}, Votes: ${voteSkipUsers.size}, Total users requested: ${totalUsers}`;
        },

        uptime: (user, platform, startTime) => {
            const diff = Date.now() - startTime;
            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            return `Bot uptime: ${h}h ${m}m ${s}s`;
        },

        version: () => "Bot version 1.0.0",

        queuecount: (user, platform, requestQueue) => `Songs in queue: ${requestQueue.length}`,

        currentuser: (user, platform, currentSong) =>
            currentSong.value ? `Requested by ${currentSong.value.requestedBy}` : "No song playing",

        lastplayed: (user, platform, songHistory) => {
            if (!songHistory || !songHistory.length) return "No songs have been played yet.";
            const last = songHistory[songHistory.length - 1];
            return `Last played: ${last.track.name} (requested by ${last.requestedBy})`;
        },

        topusers: (user, platform, userRequestCount) => {
            if (!userRequestCount) return "No requests yet.";
            const sorted = Object.entries(userRequestCount)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([u, count]) => `${u}: ${count} requests`);
            return `Top users:\n${sorted.join("\n")}`;
        },

        nextsong: (user, platform, requestQueue) =>
            requestQueue[0] ? `Next: ${requestQueue[0].track.name}` : "Queue empty",

        devs: () => "Bot developers: stolenbmws on dc",

        serverinfo: () => {
            return `Server info: ${os.type()} ${os.arch()} | CPUs: ${os.cpus().length} | Platform: ${os.platform()}`;
        },

        uptodate: () => "Bot is up-to-date"
    }
};
