// commands.js

function getHelpMessage() {
    return `
  🤖 *Bot Commands Help*:
  
  /help - Show this help message.
  /sticker - Convert an image or short video into a sticker.
  /trim - Split a video into 1-minute parts and send each part back.
  /shutdown - Shut down the bot (owner only).
  list reminders - Show your active reminders.
  cancel reminder [number] - Cancel a specific reminder by its number.
  [any message with time] - Set a reminder using natural language (e.g., "remind me to drink water in 10 minutes").
  
  📌 *Tip*: Use "/trim" as the caption when sending a video to split it!
    `.trim();
  }
  
  module.exports = { getHelpMessage };
  