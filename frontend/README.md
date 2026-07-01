# 🚨 RescueGuard Pro – Accident Detection System

A full-stack web application that detects accidents using **voice, motion, or manual trigger** and sends **automatic WhatsApp alerts** with real-time GPS location to emergency contacts.

---

## ✨ Features

- **3 Detection Methods** – Manual button, voice commands (`help`, `emergency`), and motion/shake detection
- **60‑Second Countdown** – Gives users time to cancel false alarms
- **WhatsApp Alerts** – Sends location, time, and Google Maps link to saved contacts
- **Emergency Contact Management** – Add, edit, or remove contacts (stored in MongoDB + localStorage)
- **Secure Authentication** – JWT tokens, bcrypt password hashing, email verification (OTP)
- **Feedback & Support System** – Users can send feedback and support requests
- **Admin Monitoring** – View users, feedback, and support requests

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Language** | JavaScript (used throughout frontend + backend) |
| **Frontend** | React.js, JSX, Web Speech API, DeviceMotionEvent API |
| **Backend** | Node.js, Express.js, JWT, bcrypt, Nodemailer |
| **Database** | MongoDB Atlas, Mongoose |
| **WhatsApp** | whatsapp-web.js, Puppeteer, QR Code |
| **Tools** | VS Code, Git, GitHub, Postman |

---

## 📦 Installation

### Prerequisites
- Node.js (version 18.20.5 – **MUST use v18**)
- MongoDB Atlas (or local MongoDB)
- Google Chrome (for voice detection)

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/Maryam-Khalid-22/Accident-Detector.git

# 2. Frontend setup
cd frontend
npm install
npm start

# 3. Backend setup (in a new terminal)
cd backend
npm install
node server.js
```

⚠️ Important: If your backend crashes, run nvm use 18.20.5 and delete .wwebjs_auth and .wwebjs_cache folders.

---

🔐 Environment Variables (.env)

Create a .env file in the backend folder with:

```env
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/emergency_db
JWT_SECRET=your_secret_key
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

---

🔒 Security

· Passwords hashed with bcrypt
· JWT authentication (7‑day expiry)
· Input validation (frontend + backend)
· .env file for sensitive data
· WhatsApp session management

---

📌 Fallback Feature

If automatic WhatsApp connection fails, the system sends a wa.me link – contacts just tap and send.

---

🧪 Testing

· Test the system using the "Simulate Accident" button
· Use "Test Alert System" to verify WhatsApp integration
· Voice detection works best in Google Chrome

---

🤝 Contributing

Contributions, issues, and feature requests are welcome!

---

📄 License

This project is unlicensed – all rights are reserved by the author. You may view and fork the code, but you may not use, copy, modify, or distribute it without permission.

---

👩‍💻 Author

Maryam Khalid – Full Stack Developer
📧 maryamfatima2034@gmail.com
🔗 GitHub · LinkedIn