const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');

let client = null;
let qrCodeData = null;
let isAuthenticated = false;

const initializeClient = () => {
  console.log('🔄 Initializing WhatsApp client...');
  client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
      headless: true,
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage'
      ]
    }
  });

  client.on('qr', (qr) => {
    console.log('📱 QR Code received – scan with WhatsApp');
    qrcode.toDataURL(qr, (err, url) => {
      if (!err) {
        qrCodeData = url;
        console.log('✅ QR code generated');
      }
    });
  });

  client.on('ready', () => {
    console.log('✅ WhatsApp client is READY!');
    isAuthenticated = true;
    qrCodeData = null;
  });

  client.on('authenticated', () => {
    console.log('✅ WhatsApp authenticated!');
    isAuthenticated = true;
  });

  client.on('auth_failure', (msg) => {
    console.error('❌ Auth failed:', msg);
    isAuthenticated = false;
  });

  client.on('disconnected', (reason) => {
    console.log('⚠️ Disconnected:', reason);
    isAuthenticated = false;
    qrCodeData = null;
  });

  client.initialize();
};

const getQRCode = () => qrCodeData;
const getStatus = () => isAuthenticated;
const getClient = () => client;

const destroyClient = async () => {
  if (client) {
    try {
      await client.destroy();
    } catch (err) {
      console.error('Destroy error:', err);
    }
    client = null;
  }
  isAuthenticated = false;
  qrCodeData = null;
};

const reconnect = async () => {
  console.log('🔄 Reconnecting WhatsApp...');
  await destroyClient();

  // Small delay to ensure cleanup
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Create fresh client
  client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
      headless: true,
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage'
      ]
    }
  });

  // Re-attach event handlers
  client.on('qr', (qr) => {
    console.log('📱 New QR Code received');
    qrcode.toDataURL(qr, (err, url) => {
      if (!err) {
        qrCodeData = url;
        console.log('✅ New QR code generated');
      }
    });
  });

  client.on('ready', () => {
    console.log('✅ WhatsApp client is READY again!');
    isAuthenticated = true;
    qrCodeData = null;
  });

  client.on('authenticated', () => {
    console.log('✅ WhatsApp re-authenticated!');
    isAuthenticated = true;
  });

  client.on('auth_failure', (msg) => {
    console.error('❌ Auth failed:', msg);
    isAuthenticated = false;
  });

  client.on('disconnected', (reason) => {
    console.log('⚠️ Disconnected:', reason);
    isAuthenticated = false;
    qrCodeData = null;
  });

  client.initialize();
};

const sendMessage = async (phoneNumber, message) => {
  if (!client || !isAuthenticated) {
    return { success: false, error: 'WhatsApp not connected' };
  }
  try {
    let number = phoneNumber.replace(/\D/g, '');
    if (number.startsWith('0')) number = '92' + number.substring(1);
    if (!number.endsWith('@c.us')) number = number + '@c.us';
    const sent = await client.sendMessage(number, message);
    return { success: true, messageId: sent.id.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

module.exports = {
  initializeClient,
  getQRCode,
  getStatus,
  getClient,
  destroyClient,
  reconnect,
  sendMessage
};
