const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const qrcode = require('qrcode');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const whatsappClient = require('./whatsappClient');
const fs = require('fs');
const path = require('path');

dotenv.config();

const app = express();

// CORS - Allow frontend to connect
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// MongoDB Connection
const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/emergency_db';

mongoose.connect(mongoURI)
  .then(() => console.log('✅ MongoDB Connected Successfully'))
  .catch((err) => console.error('❌ MongoDB connection error:', err.message));

  // After MongoDB connects, initialize WhatsApp client
whatsappClient.initializeClient();

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  emergencyContacts: { type: Array, default: [] },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Email configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'dumyaccidentdetector22@gmail.com',
    pass: 'fholpcreocgfhzzn'
  }
});

// Store OTPs
const otpStore = new Map();

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const sendOTPEmail = async (email, otp, type) => {
  const subject = type === 'verification' ? 'Verify Your RescueGuard Pro Account' : 'Reset Your RescueGuard Pro Password';
  const html = `<div style="font-family: Arial, sans-serif; padding: 20px;"><h2 style="color: #ff4444;">RescueGuard Pro</h2><p>Your OTP code is:</p><h1 style="font-size: 32px; color: #25D366;">${otp}</h1><p>This code expires in 10 minutes.</p></div>`;
  await transporter.sendMail({ from: 'dumyaccidentdetector22@gmail.com', to: email, subject: subject, html: html });
};

// ========== SIMPLE WHATSAPP SYSTEM (NO COMPLEX WEBSOCKET) ==========
// This stores a fake QR code that always works
let currentQRCode = null;

// Generate a QR code that always works
const generateQR = async () => {
  currentQRCode = await qrcode.toDataURL('https://web.whatsapp.com/');
  return currentQRCode;
};

generateQR(); // Generate on startup

// ========== WHATSAPP ENDPOINTS (IMPROVED) ==========

app.get('/api/whatsapp/status', (req, res) => {
  const isConnected = whatsappClient.getStatus();
  const qrExists = whatsappClient.getQRCode() !== null;
  res.json({ 
    connected: isConnected, 
    status: isConnected ? 'connected' : (qrExists ? 'waiting_for_scan' : 'disconnected'),
    hasQR: qrExists
  });
});

app.post('/api/whatsapp/connect', async (req, res) => {
  // Check if already connected
  if (whatsappClient.getStatus()) {
    return res.json({ success: true, status: 'connected' });
  }
  
  // Check if QR already exists
  let qrCode = whatsappClient.getQRCode();
  if (qrCode) {
    return res.json({ success: true, qrCode: qrCode, status: 'waiting_for_scan' });
  }
  
  // If not connected and no QR, force reinitialize
  console.log('🔄 Forcing WhatsApp reconnection...');
  await whatsappClient.reconnect();
  
  // Wait 3 seconds for QR to generate
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  qrCode = whatsappClient.getQRCode();
  if (qrCode) {
    res.json({ success: true, qrCode: qrCode, status: 'waiting_for_scan' });
  } else {
    res.json({ success: false, message: 'Failed to generate QR code. Please restart backend.' });
  }
});

app.post('/api/whatsapp/disconnect', async (req, res) => {
  try {
    await whatsappClient.destroyClient();
    
    // Delete session folder for clean reconnect
    const fs = require('fs');
    const path = require('path');
    const sessionPath = path.join(__dirname, '.wwebjs_auth');
    if (fs.existsSync(sessionPath)) {
      fs.rmSync(sessionPath, { recursive: true, force: true });
      console.log('✅ Session folder deleted');
    }
    
    res.json({ success: true, message: 'WhatsApp disconnected. Click Connect to get new QR.' });
  } catch (error) {
    res.json({ success: true, message: 'WhatsApp disconnected' });
  }
});

app.post('/api/whatsapp/reconnect', async (req, res) => {
  try {
    await whatsappClient.reconnect();
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});
// ========== AUTH ROUTES ==========

// Send verification OTP
app.post('/api/auth/send-verification', async (req, res) => {
  try {
    const { email } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'Email already registered' });
    }
    const otp = generateOTP();
    otpStore.set(email, { otp, expiresAt: Date.now() + 10 * 60 * 1000, type: 'verification' });
    await sendOTPEmail(email, otp, 'verification');
    res.json({ success: true, message: 'Verification code sent' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Verify and register
app.post('/api/auth/verify-and-register', async (req, res) => {
  try {
    const { name, email, password, phone, otp } = req.body;
    const stored = otpStore.get(email);
    if (!stored || stored.otp !== otp || stored.type !== 'verification') {
      return res.status(400).json({ success: false, error: 'Invalid verification code' });
    }
    if (Date.now() > stored.expiresAt) {
      otpStore.delete(email);
      return res.status(400).json({ success: false, error: 'Code expired' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashedPassword, phone });
    await user.save();
    otpStore.delete(email);
    const token = jwt.sign({ userId: user._id, email: user.email }, 'your_secret_key', { expiresIn: '7d' });
    res.json({ success: true, token, user: { id: user._id, name, email, phone } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ success: false, error: 'Invalid email or password' });
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(400).json({ success: false, error: 'Invalid email or password' });
    const token = jwt.sign({ userId: user._id, email: user.email }, 'your_secret_key', { expiresIn: '7d' });
    res.json({ success: true, token, user: { id: user._id, name: user.name, email: user.email, phone: user.phone } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Forgot password
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ success: false, error: 'No account found' });
    const otp = generateOTP();
    otpStore.set(email, { otp, expiresAt: Date.now() + 10 * 60 * 1000, type: 'reset' });
    await sendOTPEmail(email, otp, 'reset');
    res.json({ success: true, message: 'Reset code sent' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Reset password
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const stored = otpStore.get(email);
    if (!stored || stored.otp !== otp || stored.type !== 'reset') {
      return res.status(400).json({ success: false, error: 'Invalid reset code' });
    }
    if (Date.now() > stored.expiresAt) {
      otpStore.delete(email);
      return res.status(400).json({ success: false, error: 'Code expired' });
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.updateOne({ email }, { password: hashedPassword });
    otpStore.delete(email);
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== CONTACTS ROUTES ==========

// Helper to get user from token
const getUserFromToken = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  const token = authHeader.split(' ')[1];
  try {
    return jwt.verify(token, 'your_secret_key');
  } catch (error) {
    return null;
  }
};

app.get('/api/user/emergency-contacts', async (req, res) => {
  try {
    const userData = getUserFromToken(req);
    if (!userData) {
      // Not logged in – return empty array (not default)
      return res.json({ success: true, contacts: [] });
    }
    const user = await User.findById(userData.userId);
    // Return user's actual contacts – empty array if none
    const contacts = user?.emergencyContacts || [];
    res.json({ success: true, contacts });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/user/emergency-contacts', async (req, res) => {
  try {
    const userData = getUserFromToken(req);
    if (!userData) return res.status(401).json({ success: false, error: 'Not authenticated' });
    const { contacts } = req.body;
    await User.findByIdAndUpdate(userData.userId, { emergencyContacts: contacts });
    res.json({ success: true, contacts });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== ALERTS ==========

app.post('/api/send-emergency-alerts', async (req, res) => {
  try {
    const { contacts, location } = req.body;
    const results = [];
    
    // Check if WhatsApp is connected
    const isWhatsAppConnected = whatsappClient.getStatus();
    
    if (!isWhatsAppConnected) {
      console.log('⚠️ WhatsApp not connected. Sending links instead.');
      const mapsLink = location?.latitude ? `https://maps.google.com/?q=${location.latitude},${location.longitude}` : 'Location unavailable';
      const message = `🚨 EMERGENCY! Accident detected at ${mapsLink}. Time: ${new Date().toLocaleString()}`;
      
      for (const contact of contacts) {
        let phone = contact.phone.replace(/\D/g, '');
        if (phone.startsWith('03')) phone = '92' + phone.substring(1);
        const whatsappLink = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
        results.push({ name: contact.name, phone: contact.phone, success: true, link: whatsappLink, note: 'Open link to send message' });
      }
      return res.json({ success: true, results, note: 'WhatsApp not connected - links provided' });
    }
    
    // Real WhatsApp message sending
    const mapsLink = location?.latitude ? `https://maps.google.com/?q=${location.latitude},${location.longitude}` : 'Location unavailable';
    const fullMessage = `🚨 *EMERGENCY ALERT!* 🚨\n\n*Accident detected!*\n📍 *Location:* ${location?.address || mapsLink}\n🗺️ *Maps Link:* ${mapsLink}\n⏰ *Time:* ${new Date().toLocaleString()}\n\n⚠️ *URGENT: Please call emergency services (1122/911) and go to this location immediately!*`;
    
    for (const contact of contacts) {
      try {
        const result = await whatsappClient.sendMessage(contact.phone, fullMessage);
        if (result.success) {
          console.log(`✅ Message sent to ${contact.name} (${contact.phone})`);
          results.push({ name: contact.name, phone: contact.phone, success: true, messageId: result.messageId });
        } else {
          console.log(`❌ Failed to send to ${contact.name}: ${result.error}`);
          results.push({ name: contact.name, phone: contact.phone, success: false, error: result.error });
        }
      } catch (error) {
        console.error(`Error sending to ${contact.name}:`, error);
        results.push({ name: contact.name, phone: contact.phone, success: false, error: error.message });
      }
    }
    
    res.json({ success: true, results });
    
  } catch (error) {
    console.error('Emergency alert error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/test-sms', async (req, res) => {
  const { phoneNumber } = req.body;
  let phone = phoneNumber.replace(/\D/g, '');
  if (phone.startsWith('03')) phone = '92' + phone.substring(1);
  const link = `https://wa.me/${phone}?text=${encodeURIComponent('Test message from RescueGuard Pro')}`;
  res.json({ success: true, link });
});

app.post('/api/feedback/submit', async (req, res) => {
  try {
    const { message, userEmail, userName } = req.body;
    await transporter.sendMail({
      from: 'dumyaccidentdetector22@gmail.com',
      to: 'dumyaccidentdetector22@gmail.com',
      subject: `💬 Feedback from ${userName}`,
      html: `<h2>Feedback</h2><p>From: ${userName}</p><p>Email: ${userEmail}</p><p>Message: ${message}</p>`
    });
    res.json({ success: true });
  } catch (error) {
    res.json({ success: true });
  }
});

app.post('/api/customer-support', async (req, res) => {
  try {
    const { email, message, name } = req.body;
    await transporter.sendMail({
      from: 'dumyaccidentdetector22@gmail.com',
      to: 'dumyaccidentdetector22@gmail.com',
      subject: `📞 Support from ${email}`,
      html: `<h2>Support Request</h2><p>From: ${name || email}</p><p>Email: ${email}</p><p>Message: ${message}</p>`
    });
    res.json({ success: true });
  } catch (error) {
    res.json({ success: true });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('=================================');
  console.log('✅ Emergency Backend Server Ready');
  console.log(`📍 Port: ${PORT}`);
  console.log('=================================');
});