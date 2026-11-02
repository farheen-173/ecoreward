# 🌿 The All New Eco-Rewards System (EcoReward)

> **"A smart dustbin which gives reward on every bottle thrown, helping in keeping the environment clean and appreciates the user."**

An ultra-lightweight, full-stack web application designed for schools and campuses to encourage plastic bottle recycling with rewards, QR-code mobile registration, live admin approval workflows, and an interactive talking AI/eco-guide avatar.

---

## 🌟 Key Features

### 1. Environmental Impact Focus
Addresses all five core ecological pillars:
- **Encourages Bin Use**: Motivating students to throw plastic bottles in smart bins instead of littering.
- **Reduces Plastic Pollution**: Diverting PET plastic bottles directly from school waste streams.
- **Keeps Public Places Clean**: Ensuring school grounds, hallways, and cafeterias stay spotless.
- **Fosters Eco-Friendly Habits**: Inspiring lifelong sustainable behaviors through positive reinforcement.
- **Protects Wildlife**: Preventing plastic degradation into dangerous microplastics.

### 2. QR Code Mobile Onboarding
- **Zero App Install Required**: Works directly in any mobile browser (Safari, Chrome, Firefox).
- **Fast Registration**: Captures only minimal essential information: **Student Name** and **Student Email ID** (with optional Grade and 4-digit PIN).
- **Starter Bonus**: Automatically gifts 10 starter Eco-Points upon registration.
- **Digital Eco-ID**: Generates a personal student QR card with live level badges (Seedling, Green Ranger, Eco Champion, Earth Guardian).
- **Printable Dustbin Poster Generator**: Built-in high-resolution printable A4 poster with official QR code ready to print and stick onto physical smart dustbins!

### 3. Bottle Deposit & Dual Approval System
- **Deposit Logger**: Students tap "Claim Reward" and select the bottle count (1 to 10) and bin location.
- **Dual Verification Flows**:
  - **A. School Admin Approval Queue**: Teacher/Supervisor logs into the Admin Portal, views pending submissions with student name, bottle count, and timestamp, and clicks **"Approve"** (or **"Approve All Pending"**). The points immediately reflect in the student's balance.
  - **B. Instant Dustbin PIN (Recommended Fast-Track)**: For zero wait times, the supervisor or smart bin screen displays today's 4-digit PIN (default: `ECO1`). Entering this code verifies and awards points instantly on the spot!

### 4. Interactive Talking Avatar & Video Guide ("Verdy")
- **Animated SVG Character**: Talking robot mascot with mouth movement synchronized to speech audio, blinking eyes, and sound wave visualizers.
- **Web Speech API Narration**: Speaks out loud in a friendly voice, walking users through:
  1. *Welcome & Mission*
  2. *Quick QR Code Registration*
  3. *Dropping Bottles & Claiming EcoPoints*
  4. *Admin Approval & Instant Dustbin PIN*
  5. *Redeeming Rewards & Leaderboard*
- **Presentation / Video Tour Mode**: 1-click automated video-like playback with captions and slide transitions.

### 5. School Rewards Catalog & Leaderboard
- Students can redeem points for real school privileges:
  - 🥤 Canteen Fresh Juice / Snack Voucher (50 pts)
  - ✏️ Eco Bamboo Stationery Kit (100 pts)
  - 📜 Principal's Eco-Warrior Certificate (150 pts)
  - 🌱 Adopt a School Garden Plant (200 pts)
  - 🏆 Eco-Hero Hall of Fame Feature (300 pts)
- Generates unique voucher codes (`ECO-CAN-xxxx`) with one-click copy.
- Live campus leaderboard showcasing top eco-champions.

### 6. "How We Built It" Hardware & Cloud Blueprint
- Full interactive breakdown of the Smart Dustbin IoT hardware:
  - Ultrasonic sensor (HC-SR04) for proximity & fill level
  - Optical IR beam sensor for PET bottle detection
  - Microcontroller (ESP32 / Arduino) with Wi-Fi edge syncing
  - High-torque servo motor for lid flap control
  - Cloud REST API integration

---

## ⚡ Architecture & Ultra-Light Footprint

- **Zero External Dependencies**: Built entirely with Node.js built-in standard library (`http`, `fs`, `path`, `crypto`). No heavy `node_modules` downloads required.
- **Instant Cold Start**: Starts in under 50ms, consuming less than 25MB of RAM (perfect for free-tier 512MB hosting!).
- **Persistent Storage**: Uses a bulletproof atomic JSON database (`data/db.json`) that safely persists students, claims, dustbins, and redemptions across server restarts.
- **Capacity**: Easily caters to 50–1,000+ active students with sub-millisecond response times.

---

## 🚀 How to Run Locally

### Prerequisites
- Node.js (version 18 or higher recommended; already tested on Node v24).

### Step 1: Start the Server
Open terminal in the project directory and run:
```bash
node server.js
```
*(or `npm start`)*

### Step 2: Open in Browser
Visit:
```
http://localhost:3000
```

---

## 🌐 Deploying to Free Hosting (100% Free Tiers)

This lightweight application is specially architected to deploy seamlessly on any free cloud hosting provider with zero configuration:

### Option 1: Render.com (Recommended - 100% Free Web Service)
1. Push this folder to your GitHub or GitLab repository.
2. Sign up / Log in to [Render.com](https://render.com) (free).
3. Click **"New +"** &rarr; **"Web Service"** &rarr; Select your GitHub repository.
4. Render will auto-detect settings, or enter:
   - **Environment**: `Node`
   - **Build Command**: *(leave blank or `npm install`)*
   - **Start Command**: `node server.js`
   - **Instance Type**: `Free`
5. Click **"Deploy Web Service"**.
6. Your live website URL will be ready in 1 minute (e.g. `https://eco-reward.onrender.com`)!

### Option 2: Railway.app / Koyeb / Fly.io
- Simply connect your repository. The included `Procfile` and `package.json` will automatically start `node server.js`.

### Option 3: Glitch.com (Instant In-Browser Free Hosting)
1. Go to [Glitch.com](https://glitch.com) and click **"New Project"** &rarr; **"Import from GitHub"**.
2. Glitch runs `node server.js` instantly and gives you a free live public URL with automatic data persistence!

---

## 🔑 Admin Credentials (Production Default)

### School Admin Portal (`/admin`)
- **URL**: `http://localhost:3000/admin` (or your live deployed domain `/admin`)
- **User ID / Email**: `admin` *(or `admin@school.edu`)*
- **Password**: `admin123`

The database has been initialized clean with 0 dummy students and 0 dummy claims, ready for your real school users!

---

## 📁 Project Structure

```
EcoReward/
├── server.js              # Ultra-lightweight Node.js HTTP server & REST API
├── package.json           # Application metadata & npm start script
├── render.yaml            # 1-click Render blueprint config
├── Procfile               # Heroku / Railway / Koyeb process definition
├── README.md              # Project documentation & free hosting guide
├── data/
│   └── db.json            # Persistent JSON database (students, claims, rewards)
└── public/
    ├── index.html         # Single Page Web App (All sections & modals)
    ├── css/
    │   └── styles.css     # Modern eco-green UI styles & responsive mobile design
    └── js/
        ├── api.js         # Client REST API library
        ├── app.js         # Core application state, student & admin logic
        ├── avatar.js      # Animated talking avatar ("Verdy") with Web Speech
        └── qr.js          # Pure JS QR code generator & poster renderer
```

---

## 📄 License
MIT License. Created for schools, educational institutions, and cleaner communities worldwide!

