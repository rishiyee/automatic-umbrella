import pkg from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Client, LocalAuth, MessageMedia } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox'],
  },
});

const knowledgeBase = {
  hello: `🌿 *Namaste from Chembarathi Wayanad!* 🌄🍃 Let me know how I can assist you today! 😊`,
  hi: `🌿 *Namaste from Chembarathi Wayanad!* 🌿 How can I help you today? 😊`,
  roomDetails: `🏡 *Cottage Types:*\n1️⃣ *Premium Mountain View*\n2️⃣ *Premium Pool & Mountain View*\n3️⃣ *Deluxe Pool & Forest View*\n4️⃣ *Deluxe Lawn View*\n5️⃣ *Honeymoon Suite* (💖 Private Pool + Jacuzzi)\n6️⃣ *Pool Villa* (🏊 Private Pool + Jacuzzi)`,
  rates: `💰 *Room Rates (From April 10, 2025):*\n- *Premium Cottage*: ₹8,500\n- *Deluxe Cottage*: ₹8,000\n- *Honeymoon Suite*: ₹15,000\n- *Private Pool Villa*: ₹13,000\n---\n💰 *Room Rates (Valid till April 09, 2025):*\n- *Premium Cottage*: ₹7,500\n- *Deluxe Cottage*: ₹7,000\n- *Honeymoon Suite*: ₹14,000\n- *Private Pool Villa*: ₹12,000`,
  checkIn: `🕒 *Check-in*: 2:00 PM 🕚 *Check-out*: 11:00 AM\n🍽️ *Breakfast*: 8:30 AM – 9:30 AM 🌙 *Dinner*: 8:30 PM – 9:30 PM`,
  facilities: `🏞️ *Facilities:*\n- 📶 *Free Wi-Fi*\n- 🏊 *Swimming Pool*\n- 🍽️ *Restaurant*\n- 🚶 *Nature Walks*\n- 🎲 *Indoor Games*\n- 🔥 *Campfire* (on request – ₹1,000)`,
  cancellationPolicy: `📅 *Cancellation Policy:*\n✅ *Full refund* if cancelled *15+ days* before check-in\n🌓 *50% refund* or 1-time date change *14–2 days* before check-in\n❌ *No refund* within *2 days* of check-in`,
  location: `📍 *Our Location:*\nChembarathi Wayanad – nestled in the hills of *Wayanad, Kerala* 🌄🌿\n🚉 *Nearest Railway*: Kozhikode ✈️ *Nearest Airport*: Calicut (CCJ)\n🗺️ *Find us on Google Maps*: [Google Maps](https://maps.app.goo.gl/Whf944WtY8KgzgDk6)`,
  bookNow: `📖 *To Book:*\nPlease share the following details:\n• *Full Name*\n• *Check-in/Check-out Dates*\n• *Cottage Type*\n• *Contact Number*\n📞 Call/WhatsApp: +91 88918 88818 | 78978 97870\n📧 Email: hello@chembarathi.com`,
  cancel: `❌ *Booking Cancellation:*\nPlease reach out to us ASAP to cancel or reschedule. Full refund available for cancellations made 15+ days prior.`,
  help: `🤖 *Need Help?*\nI can assist you with:\n• Room Details\n• Rates\n• Check-in Info\n• Facilities\n• Cancellation Policy\n• Location\n• Booking Info\nJust type what you need help with 👇`,
};

const roomImages = [
  {
    path: 'H:\\Bot\\images\\premium_room_1.jpg',
    caption: '🏡 *Premium Room* – A beautiful view of our premium room!',
  },
  {
    path: 'H:\\Bot\\images\\honeymoon_suite_1.jpg',
    caption: '💖 *Honeymoon Suite* – A romantic getaway with a private pool!',
  },
];

const sendMultipleImages = async (message) => {
  for (const image of roomImages) {
    if (fs.existsSync(image.path)) {
      const media = MessageMedia.fromFilePath(image.path);
      await client.sendMessage(message.from, media, { caption: image.caption });
    } else {
      await message.reply('Sorry, one of the requested images could not be found.');
    }
  }
};

const sendPDF = async (message) => {
  const pdfPath = 'H:\\Bot\\Campus Recruitment Program 2025.pdf';
  if (fs.existsSync(pdfPath)) {
    const media = MessageMedia.fromFilePath(pdfPath);
    await client.sendMessage(message.from, media, { caption: 'Here is your PDF file.' });
  } else {
    await message.reply('Sorry, the PDF file could not be found.');
  }
};

const sendVideo = async (message) => {
  const videoPath = 'H:\\Bot\\videos\\sample_video.mp4';
  if (fs.existsSync(videoPath)) {
    const media = MessageMedia.fromFilePath(videoPath);
    await client.sendMessage(message.from, media, { caption: 'Here is your video file.' });
  } else {
    await message.reply('Sorry, the video file could not be found.');
  }
};

client.on('qr', (qr) => {
  console.log('QR RECEIVED, scan this with your WhatsApp app:');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('✅ Client is ready!');
});

client.on('message', async (message) => {
  const messageText = message.body.toLowerCase();
  console.log(`📩 Received: ${messageText}`);

  if (messageText.includes('hello') || messageText.includes('hi') || messageText.includes('hai')) {
    await message.reply(knowledgeBase.hello);
  } else if (messageText.includes('room details')) {
    await message.reply(knowledgeBase.roomDetails);
  } else if (messageText.includes('rates')) {
    await message.reply(knowledgeBase.rates);
  } else if (messageText.includes('check-in') || messageText.includes('checkin')) {
    await message.reply(knowledgeBase.checkIn);
  } else if (messageText.includes('facilities')) {
    await message.reply(knowledgeBase.facilities);
  } else if (messageText.includes('cancellation policy')) {
    await message.reply(knowledgeBase.cancellationPolicy);
  } else if (messageText.includes('location')) {
    await message.reply(knowledgeBase.location);
  } else if (messageText.includes('book now')) {
    await message.reply(knowledgeBase.bookNow);
  } else if (messageText.includes('cancel')) {
    await message.reply(knowledgeBase.cancel);
  } else if (messageText.includes('help')) {
    await message.reply(knowledgeBase.help);
  } else if (
    messageText.includes('room image') ||
    messageText.includes('pics') ||
    messageText.includes('photos') ||
    messageText.includes('photo') ||
    messageText.includes('image') ||
    messageText.includes('img')
  ) {
    await sendMultipleImages(message);
  } else if (messageText.includes('pdf')) {
    await sendPDF(message);
  } else if (messageText.includes('video')) {
    await sendVideo(message);
  } else {
    await message.reply("🙏 Currently, our team is busy. We will reply as soon as possible. Thank you for your patience!");
  }
});

client.on('auth_failure', (msg) => {
  console.error('❌ AUTHENTICATION FAILURE:', msg);
});

client.on('disconnected', (reason) => {
  console.warn('⚠️ Client disconnected:', reason);
});

client.initialize();

process.on('SIGINT', async () => {
  console.log('🛑 Shutting down...');
  await client.destroy();
  process.exit(0);
});

console.log('🚀 WhatsApp bot is starting...');
