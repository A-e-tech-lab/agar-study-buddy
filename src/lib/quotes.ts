const QUOTES = [
  "Small steps every day lead to big results. 🌱",
  "Push yourself, because no one else will do it for you. 💪",
  "Success is the sum of small efforts repeated daily. 🔥",
  "Don't watch the clock; do what it does. Keep going. ⏰",
  "Dream big. Study hard. Stay focused. 🎯",
  "Your only limit is you. Break it today. 🚀",
  "Discipline beats motivation every time. ✨",
  "Believe you can and you're halfway there. 💯",
  "The expert in anything was once a beginner. 📚",
  "Focus on progress, not perfection. 🌟",
];

export function dailyQuote(): string {
  const day = Math.floor(Date.now() / 86400000);
  return QUOTES[day % QUOTES.length];
}

export const CHEERS = [
  "Great job! You're awesome 🔥",
  "Keep going 💯",
  "You're crushing it! 🚀",
  "One step closer! ✨",
  "Brilliant work! 🌟",
  "Unstoppable! 💪",
];

export function randomCheer(): string {
  return CHEERS[Math.floor(Math.random() * CHEERS.length)];
}
