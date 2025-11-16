const say = require('say');

module.exports = {
    name: "fun",
    commands: {
        roll: (user) => `🎲 ${user} rolled a ${Math.floor(Math.random()*100)+1}`,
        flip: (user) => `🪙 ${user} flipped a ${Math.random()<0.5?"heads":"tails"}`,
        '8ball': (user, platform, question) => {
            const answers = ["Yes", "No", "Maybe", "Definitely", "Absolutely not", "Ask again later"];
            return `🎱 ${answers[Math.floor(Math.random()*answers.length)]}`;
        },
        joke: () => {
            const jokes = [
                "Why did the chicken cross the road? To get to the other side!",
                "I told my computer I needed a break, and it said 'No problem, I'll go to sleep.'",
                "Why don't scientists trust atoms? Because they make up everything!"
            ];
            return jokes[Math.floor(Math.random()*jokes.length)];
        },

        say: (user, platform, text) => {
            if (!text) return "You need to provide something to say!";
            // Send TTS
            say.speak(text, 'Microsoft Zira Desktop', 1.0); // Voice and speed
            return `🗣 Speaking: "${text}"`;
        },

        avatar: (user) => `Avatar URL for ${user} placeholder`,
        randomuser: () => "Random user placeholder",
        fact: () => "Random fact placeholder",
        trivia: () => "Trivia question placeholder",
        rate: (user, platform, item) => `I rate ${item} ${Math.floor(Math.random()*10)+1}/10`,
        insult: (user, platform, target) => `${target}, you are funny looking! 😜`,
        compliment: (user, platform, target) => `${target}, you are awesome! 😊`,
        pingpong: () => "pong!",
        fortune: () => "You will have a great day!"
    }
};
