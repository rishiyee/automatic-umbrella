const qrcode = require('qrcode-terminal');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const schedule = require('node-schedule');
const axios = require('axios');
const chrono = require('chrono-node');
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

let client;
let isShuttingDown = false;

const threadMemory = new Map();
const MAX_MEMORY_LENGTH = 10;
const MEMORY_FILE = 'thread_memory.json';

function extractPhoneNumber(whatsappId) {
  const match = whatsappId.match(/^\d+/);
  return match ? match[0] : whatsappId;
}

function getThreadId(msg) {
  return msg.isGroup ? `group_${msg.from}` : extractPhoneNumber(msg.from);
}

async function loadThreadMemory() {
  try {
    const data = await fs.readFile(MEMORY_FILE, 'utf8');
    const savedMemory = JSON.parse(data);
    for (const [threadId, messages] of Object.entries(savedMemory)) {
      threadMemory.set(threadId, messages);
    }
    console.log('✅ Thread memory loaded from file');
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error('Error loading thread memory:', err);
    }
  }
}

async function saveThreadMemory() {
  try {
    const dataToSave = {};
    for (const [threadId, messages] of threadMemory.entries()) {
      dataToSave[threadId] = messages;
    }
    await fs.writeFile(MEMORY_FILE, JSON.stringify(dataToSave, null, 2));
    console.log('✅ Thread memory saved to file');
  } catch (err) {
    console.error('Error saving thread memory:', err);
  }
}

function updateThreadMemory(msg, message, isUser = true) {
  const threadId = msg ? getThreadId(msg) : message.threadId;
  const messages = threadMemory.get(threadId) || [];
  const senderInfo = msg && msg.isGroup ? `[${msg._data.notifyName || 'Unknown'}] ` : '';
  messages.push({
    role: isUser ? 'user' : 'assistant',
    content: isUser ? `${senderInfo}${message}` : message.content || message,
    timestamp: new Date().toISOString()
  });
  if (messages.length > MAX_MEMORY_LENGTH) {
    messages.splice(0, messages.length - MAX_MEMORY_LENGTH);
  }
  threadMemory.set(threadId, messages);
}

function initializeClient() {
  client = new Client({ authStrategy: new LocalAuth() });

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const BOT_OWNER = process.env.BOT_OWNER;
  const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  const reminders = new Map();
  const REMINDERS_FILE = 'reminders.json';

  async function loadReminders() {
    try {
      const data = await fs.readFile(REMINDERS_FILE, 'utf8');
      const savedReminders = JSON.parse(data);
      for (const [userId, userReminders] of Object.entries(savedReminders)) {
        const restored = userReminders.map(r => {
          const time = new Date(r.time);
          if (time > new Date()) {
            const job = schedule.scheduleJob(time, () => {
              if (!isShuttingDown) {
                client.sendMessage(userId, `⏰ Reminder: ${r.text}`);
              }
            });
            return { ...r, time, job };
          }
          return null;
        }).filter(Boolean);
        if (restored.length) reminders.set(userId, restored);
      }
      console.log('✅ Reminders loaded from file');
    } catch (err) {
      if (err.code !== 'ENOENT') {
        console.error('Error loading reminders:', err);
      }
    }
  }

  async function saveReminders() {
    try {
      const dataToSave = {};
      for (const [userId, userReminders] of reminders.entries()) {
        dataToSave[userId] = userReminders.map(r => ({ text: r.text, time: r.time.toISOString() }));
      }
      await fs.writeFile(REMINDERS_FILE, JSON.stringify(dataToSave, null, 2));
      console.log('✅ Reminders saved to file');
    } catch (err) {
      console.error('Error saving reminders:', err);
    }
  }

  async function callGemini(prompt, threadId) {
    try {
      const history = (threadMemory.get(threadId) || []).map(msg => ({
        role: msg.role,
        parts: [{ text: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content) }]
      }));

      history.push({
        role: 'user',
        parts: [{ text: typeof prompt === 'string' ? prompt : JSON.stringify(prompt) }]
      });

      const body = {
        contents: history,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024
        }
      };

      const res = await axios.post(GEMINI_URL, body, {
        headers: { 'Content-Type': 'application/json' }
      });

      const response = res.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (response) {
        updateThreadMemory(null, { content: response, threadId }, false);
        await saveThreadMemory();
      }

      return response;
    } catch (err) {
      console.error('❌ Gemini call failed:', err.response?.data || err.message);
      return null;
    }
  }

  async function extractMessageOnly(input, threadId) {
    const prompt = `Extract only the reminder message (no date/time) from: "${input}".`;
    return await callGemini(prompt, threadId);
  }

  async function processVideoToSticker(videoBuffer) {
    try {
      const frameBuffer = await sharp(videoBuffer, { pages: 1 })
        .resize(512, 512, { fit: 'contain' })
        .webp()
        .toBuffer();
      return frameBuffer;
    } catch (err) {
      console.error('Error processing video:', err);
      return null;
    }
  }

  client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
    console.log('📱 Scan the QR code to log in.');
  });

  client.on('ready', async () => {
    console.log('✅ WhatsApp bot is ready!');
    await loadReminders();
    await loadThreadMemory();
  });

  client.on('message', async msg => {
    if (isShuttingDown) return;

    const userId = msg.from;
    const threadId = getThreadId(msg);
    const text = msg.body.trim().toLowerCase();

    updateThreadMemory(msg, msg.body);
    await saveThreadMemory();

    if (text === '/shutdown') {
      const senderNumber = extractPhoneNumber(userId);
      if (senderNumber === BOT_OWNER) {
        msg.reply('🔄 Shutting down the bot...');
        await cleanup();
      } else {
        msg.reply('❌ Only the bot owner can use this command.');
      }
      return;
    }

    if (text === 'list reminders') {
      const list = reminders.get(threadId) || [];
      if (!list.length) {
        msg.reply('📭 No reminders set.');
      } else {
        let reply = '📋 Your reminders:\n';
        list.forEach((r, i) => {
          reply += `\n${i + 1}. ${r.text} at ${r.time.toLocaleString()}`;
        });
        msg.reply(reply);
      }
      return;
    }

    const cancelMatch = text.match(/^cancel reminder (\d+)$/);
    if (cancelMatch) {
      const index = parseInt(cancelMatch[1]) - 1;
      const list = reminders.get(threadId) || [];
      if (index >= 0 && index < list.length) {
        const removed = list.splice(index, 1)[0];
        removed.job.cancel();
        await saveReminders();
        msg.reply(`❌ Canceled reminder: "${removed.text}"`);
      } else {
        msg.reply('⚠️ Invalid reminder number.');
      }
      return;
    }

    const parsedTime = chrono.parseDate(msg.body);
    if (parsedTime) {
      const reminderText = await extractMessageOnly(msg.body, threadId);
      if (!reminderText) {
        msg.reply("⚠️ I couldn't extract the reminder message. Please rephrase.");
        return;
      }

      const job = schedule.scheduleJob(parsedTime, () => {
        if (!isShuttingDown) {
          client.sendMessage(userId, `⏰ Reminder: ${reminderText}`);
        }
      });

      const userReminders = reminders.get(threadId) || [];
      userReminders.push({ text: reminderText, time: parsedTime, job });
      reminders.set(threadId, userReminders);
      await saveReminders();

      msg.reply(`✅ Reminder set!\n🕒 ${parsedTime.toLocaleString()}\n📌 "${reminderText}"`);
      return;
    }

    if (msg.hasMedia && text === '/sticker') {
      const media = await msg.downloadMedia();
      let buffer;

      if (media.mimetype.startsWith('image/')) {
        buffer = Buffer.from(media.data, 'base64');
      } else if (media.mimetype.startsWith('video/')) {
        buffer = await processVideoToSticker(Buffer.from(media.data, 'base64'));
        if (!buffer) {
          msg.reply('❌ Failed to process video. Please try with a shorter video.');
          return;
        }
      } else {
        msg.reply('❌ Only images and videos can be converted to stickers.');
        return;
      }

      const webpBuffer = await sharp(buffer)
        .resize(512, 512, { fit: 'contain' })
        .webp()
        .toBuffer();

      const base64Sticker = webpBuffer.toString('base64');
      const sticker = new MessageMedia('image/webp', base64Sticker, 'sticker.webp');

      await client.sendMessage(msg.from, sticker, { sendMediaAsSticker: true });
      return;
    }

    const response = await callGemini(msg.body, threadId);
    msg.reply(response || "🤖 Sorry, I didn't understand that.");
  });

  async function cleanup() {
    isShuttingDown = true;
    console.log('🔄 Saving reminders and thread memory before shutdown...');
    await Promise.all([saveReminders(), saveThreadMemory()]);
    console.log('👋 Shutting down...');
    process.exit(0);
  }

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('SIGUSR2', cleanup);

  client.initialize();
}

initializeClient();
