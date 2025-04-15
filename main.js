// main.js
import pkg from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';

const { Client, MessageMedia, LocalAuth } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Express setup for Render
const app = express();
const port = process.env.PORT || 10000;
app.get('/', (req, res) => res.send('Chembarathi Bot is running ✅'));
app.listen(port, () => console.log(`🚀 Web server running on port ${port}`));

// WhatsApp client setup
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox'],
  },
});

const userState = new Map();

const roomData = {
  '1': {
    name: 'Deluxe Lawn View',
    rate: '₹8000',
    folder: path.join(__dirname, 'images', 'deluxe_lawn_view'),
  },
  '2': {
    name: 'Premium Mountain View',
    rate: '₹8500',
    folder: path.join(__dirname, 'images', 'premium_mountain_view'),
  },
  '3': {
    name: 'Pool Villa',
    rate: '₹15000',
    folder: path.join(__dirname, 'images', 'pool_villa'),
  },
  '4': {
    name: 'Deluxe Pool & Forest View',
    rate: '₹8000',
    folder: path.join(__dirname, 'images', 'deluxe_pool_forest_view'),
  },
  '5': {
    name: 'Honeymoon Suite',
    rate: '₹13000',
    folder: path.join(__dirname, 'images', 'honeymoon_suite'),
  },
  '6': {
    name: 'Premium Pool & Mountain View',
    rate: '₹8500',
    folder: path.join(__dirname, 'images', 'premium_pool_mountain_view'),
  },
};

const keywords = {
  '1': ['1', 'room', 'rooms', 'room details', 'room info', 'room options'],
  '2': ['2', 'rates', 'price', 'pricing', 'cost'],
  '3': ['3', 'check in', 'check out', 'timing', 'check-in', 'check-out'],
  '4': ['4', 'facilities', 'amenities', 'services'],
  '5': ['5', 'cancellation', 'cancel policy', 'refund', 'cancellation policy'],
  '6': ['6', 'location', 'address', 'map', 'directions'],
  '7': ['7', 'booking', 'book', 'reserve', 'reservation', 'booking info'],
};

client.on('qr', (qr) => {
  console.log('QR RECEIVED, scan this with your WhatsApp app:');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('✅ Client is ready!');

  // Send ping every 13 minutes
  const targetNumber = '918547838091@c.us'; // replace with the number you want to ping
  setInterval(async () => {
    try {
      const chat = await client.getChatById(targetNumber);
      await chat.sendMessage('👋 Ping to keep the bot alive!');
      console.log('✅ Ping message sent');
    } catch (err) {
      console.error('❌ Ping failed:', err.message);
    }
  }, 1 * 60 * 1000);
});

const sendMainMenu = async (chat) => {
  userState.set(chat.id._serialized, 'main');
  await chat.sendMessage(`🌿 *Namaste from Chembarathi Wayanad!* 🌄🍃\nHow can I assist you today?\n\n*1.* Room Details\n*2.* Rates\n*3.* Check-in/Check-out Info\n*4.* Facilities\n*5.* Cancellation Policy\n*6.* Location\n*7.* Booking Info\n\nSend *0* at any time to return to this menu.`);
};

const sendRoomOptions = async (chat) => {
  userState.set(chat.id._serialized, 'room_selection');
  let options = '🏡 *Room Options:*\n';
  for (const [key, room] of Object.entries(roomData)) {
    options += `*${key}.* ${room.name}\n`;
  }
  options += '\nSend the number of the room you\'d like to see.';
  await chat.sendMessage(options);
};

const sendRoomDetails = async (chat, number) => {
  const room = roomData[number];
  if (!room) return;

  const images = fs.readdirSync(room.folder);
  for (const image of images) {
    const media = MessageMedia.fromFilePath(path.join(room.folder, image));
    await chat.sendMessage(media);
  }

  await chat.sendMessage(`💸 *${room.name}* costs *${room.rate}* per night.`);

  userState.set(chat.id._serialized, 'after_room_details');
  await chat.sendMessage(`Would you like to:\n*1.* View another room\n*2.* Book this room\n*0.* Return to main menu`);
};

const sendBookingInfo = async (chat) => {
  await chat.sendMessage(`
📝 *Booking Format:*
Please send your booking details in the following format:

Name: Your Name
Check-in: DD-MM-YYYY
Check-out: DD-MM-YYYY
Number of Guests: 2 Adults, 1 Child

Once submitted, we’ll get back to you shortly to confirm your booking. ✅

Send *0* to return to the main menu.
  `);
};

client.on('message', async (message) => {
  const chat = await message.getChat();
  const msg = message.body.trim().toLowerCase();
  const userId = message.from;

  console.log(`[${new Date().toLocaleString()}] Message from ${message.from}: ${message.body}`);

  if (["hi", "hello", "hai", "namaste", "hey"].includes(msg)) {
    userState.set(userId, 'main');
    return await sendMainMenu(chat);
  }

  if (msg === '0') {
    userState.delete(userId);
    return await sendMainMenu(chat);
  }

  const state = userState.get(userId) || 'main';

  const bookingRegex = /name:\s*.+\ncheck-in:\s*\d{2}-\d{2}-\d{4}\ncheck-out:\s*\d{2}-\d{2}-\d{4}\nnumber of guests:\s*.+/i;
  if (bookingRegex.test(message.body.trim())) {
    await chat.sendMessage('✅ *Thank you for your booking details!*\nOur team will connect with you shortly to confirm your booking.');
    return await sendMainMenu(chat);
  }

  const matchKey = Object.entries(keywords).find(([key, values]) =>
    values.some(value => msg.includes(value))
  )?.[0];

  switch (state) {
    case 'main': {
      switch (matchKey) {
        case '1':
          return await sendRoomOptions(chat);
        case '2':
          return await chat.sendMessage('✨ *Room Rates:* ✨\nPremium Mountain View – ₹8,500\nPremium Pool & Mountain View – ₹8,500\nDeluxe Pool & Forest View – ₹8,000\nDeluxe Lawn View – ₹8,000\nHoneymoon Suite – ~₹20,000~ ₹15,000\nPool Villa – ~₹15,000~ ₹13,000 \nSend *0* to return to main menu.');
        case '3':
          return await chat.sendMessage('🕰 *Check-in/Check-out Info:* Check-in time: 2:00 PM, Check-out time: 12:00 PM.\nSend *0* to return to main menu.');
        case '4':
          return await chat.sendMessage('✨ *Facilities:* Free Wi-Fi, Pool, Forest View, etc.\nSend *0* to return to main menu.');
        case '5':
          return await chat.sendMessage('❗ *Cancellation Policy:* 24-hour notice required for free cancellation.\nSend *0* to return to main menu.');
        case '6':
          return await chat.sendMessage('📍 *Location:* [Chembarathi Wayanad on Google Maps](https://maps.app.goo.gl/wrEsauyr2EQbnP2n6) Send *0* to return to main menu.');
        case '7':
          return await sendBookingInfo(chat);
        default:
          return await chat.sendMessage("🙏 Thank you for reaching out! Our team is currently busy assisting other guests. We’ll get back to you shortly. We appreciate your patience! 🌿\n*0* to return to main menu.");
      }
    }

    case 'room_selection': {
      if (roomData[msg]) {
        return await sendRoomDetails(chat, msg);
      } else {
        return await chat.sendMessage('❌ Invalid room selection.\nPlease enter a valid room number or *0* to return to main menu.');
      }
    }

    case 'after_room_details': {
      if (msg === '1') {
        return await sendRoomOptions(chat);
      } else if (msg === '2') {
        return await sendBookingInfo(chat);
      } else {
        return await chat.sendMessage('Thank you! ✅ Our team will connect with you shortly to confirm the booking.\nSend *0* to return to the main menu.');
      }
    }

    default: {
      return await sendMainMenu(chat);
    }
  }
});

client.initialize();
