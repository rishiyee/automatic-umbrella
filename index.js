// index.js
const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');
const schedule = require('node-schedule');

const client = new Client({
  authStrategy: new LocalAuth()
});

client.on('qr', (qr) => {
  qrcode.generate(qr, { small: true });
  console.log('Scan the QR code to log in.');
});

client.on('ready', () => {
  console.log('✅ WhatsApp Bot is ready!');
});

client.on('message', async msg => {
  if (msg.body.startsWith('!remind')) {
    // Format: !remind 2025-05-06 15:30 Drink water!
    const parts = msg.body.split(' ');
    if (parts.length < 4) {
      msg.reply('❗ Please use the format: !remind YYYY-MM-DD HH:MM Message');
      return;
    }

    const [dateStr, timeStr, ...messageParts] = parts.slice(1);
    const message = messageParts.join(' ');
    const dateTime = new Date(`${dateStr}T${timeStr}:00`);

    if (isNaN(dateTime.getTime())) {
      msg.reply('❗ Invalid date or time format.');
      return;
    }

    schedule.scheduleJob(dateTime, () => {
      client.sendMessage(msg.from, `⏰ Reminder: ${message}`);
    });

    msg.reply(`✅ Reminder set for ${dateStr} at ${timeStr}`);
  }
});

client.initialize();
