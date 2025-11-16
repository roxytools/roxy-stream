const fs = require('fs');
const config = require('../config');

let voteSkipUsers = new Set();

function loadQueue() {
  try { return JSON.parse(fs.readFileSync(config.REQUEST_FILE)); }
  catch { return []; }
}

function saveQueue(queue) {
  fs.writeFileSync(config.REQUEST_FILE, JSON.stringify(queue, null, 2));
}

module.exports = {
  name: "music",
  commands: {
    queue: (user, platform) => {
      const queue = loadQueue();
      if (!queue.length) return `${platform} queue is empty.`;
      return queue.map((s,i)=>`${i+1}. ${s.track.name} (requested by ${s.requestedBy})`).join('\n');
    },

    current: (user, platform, currentSong) => {
      if (!currentSong.value) return `No song is currently playing.`;
      return `Now playing: ${currentSong.value.track.name} (requested by ${currentSong.value.requestedBy})`;
    },

    skip: (user, platform, currentSong, playNext) => {
      if (!currentSong.value) return `No song is playing to skip.`;
      const skipped = currentSong.value;
      voteSkipUsers.clear();
      playNext();
      return `Skipped: ${skipped.track.name}`;
    },

    voteSkip: (user, platform, currentSong, playNext) => {
      if (!currentSong.value) return `No song is playing to vote skip.`;
      if (voteSkipUsers.has(user)) return `${user} already voted.`;
      voteSkipUsers.add(user);
      if (voteSkipUsers.size >= config.VOTE_THRESHOLD) {
        const skipped = currentSong.value;
        voteSkipUsers.clear();
        playNext();
        return `Vote threshold reached. Skipped: ${skipped.track.name}`;
      }
      return `${user} voted to skip (${voteSkipUsers.size}/${config.VOTE_THRESHOLD})`;
    },

    clearVotes: () => {
      voteSkipUsers.clear();
      return `All vote skip votes cleared.`;
    },

    repeat: (user, platform, currentSong, playNext, requestQueue) => {
      if (!currentSong.value) return `Nothing to repeat.`;
      const song = currentSong.value;
      requestQueue.unshift(song);
      playNext();
      return `Repeating: ${song.track.name}`;
    },

    shuffle: (user, platform, currentSong, playNext, requestQueue) => {
      if (!requestQueue.length) return `Queue is empty.`;
      for (let i = requestQueue.length-1; i>0; i--){
        const j = Math.floor(Math.random()*(i+1));
        [requestQueue[i], requestQueue[j]] = [requestQueue[j], requestQueue[i]];
      }
      return `Queue shuffled.`;
    },

    move: (user, platform, args) => {
      const queue = loadQueue();
      if (!config.ADMINS[platform]?.includes(user)) return "❌ Not authorized";
      const from = parseInt(args[0]), to = parseInt(args[1]);
      if (isNaN(from)||isNaN(to)||from<1||to<1||from>queue.length||to>queue.length) return "Invalid indexes.";
      const [song] = queue.splice(from-1,1);
      queue.splice(to-1,0,song);
      saveQueue(queue);
      return `Moved "${song.track.name}" from ${from} to ${to}`;
    },

    nowplaying: (user, platform, currentSong) => {
      if (!currentSong.value) return "No song is playing.";
      const t = currentSong.value.track;
      return `${t.name} by ${t.artists.map(a=>a.name).join(', ')} [${t.album.name}] ${Math.floor(t.duration_ms/60000)}:${Math.floor((t.duration_ms/1000)%60).toString().padStart(2,'0')}`;
    }
  }
};
