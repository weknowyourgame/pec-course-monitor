# 🎯 PEC Course Monitor Scout

> **Never miss your dream course again!** 🚀

An intelligent browser agent that automatically monitors course availability at **Punjab Engineering College (PEC)** and instantly notifies you when your desired courses become available. Say goodbye to constantly refreshing the PEC portal! 

## 🎯 What This Does For You

This scout is your **24/7 course hunting assistant** that:

- 🔐 **Auto-logs into PEC portal** (handles CAPTCHA like a boss!)
- 👀 **Watches ALL courses** in real-time
- 🎯 **Prioritizes CS6701 COMPUTER NETWORKS** (and any course you want!)
- 📧 **Sends you instant email alerts** when courses become selectable
- 🔄 **Runs forever** - never stops monitoring
- 🧠 **Smart AI** that learns and adapts

## 🚀 Why You Need This

**PEC students know the struggle:**
- Courses fill up in SECONDS
- You're always late to the party
- Manual checking is exhausting
- Missing CS6701 = 😭

**This scout solves ALL of that!** 

## 🎮 Features That'll Blow Your Mind

- **🤖 AI CAPTCHA Solver**: Uses GPT-4o to solve CAPTCHAs automatically
- **📊 Real-time Course Tracking**: Monitors every checkbox state
- **🎯 Priority Course Alerts**: Special focus on CS6701 and your favorites
- **📧 Smart Email Reports**: Beautiful HTML reports with course status
- **🔄 Bulletproof**: Falls back to manual input if AI fails
- **⚡ Lightning Fast**: Checks every hour (or whenever you want)

## 📋 What You Need

- **Node.js 18+** (your coding setup)
- **pnpm** (faster than npm, trust me)
- **OpenAI API key** (for the AI magic)
- **Resend API key** (for email notifications)
- **PEC login credentials** (duh!)

## 🛠️ Setup (5 minutes!)

### 1. Clone & Install
```bash
git clone <repository-url>
cd browser-scout
pnpm install
```

### 2. Configure Your Secrets
```bash
cp .env.example .env
```

### 3. Add Your Keys
```env
# Your PEC Login (the real deal)
USERNAME=your_pec_username
PASSWORD=your_pec_password

# OpenAI API (for CAPTCHA magic)
OPENAI_API_KEY=your_openai_api_key

# Resend API (for email notifications)
RESEND_API_KEY=your_resend_api_key

# Browserbase API (optional, for cloud execution)
BROWSERBASE_API_KEY=your_browserbase_api_key
BROWSERBASE_PROJECT_ID=your_project_id
```

## 🎮 Let's Go!

### Quick Start
```bash
pnpm start
```

**That's it!** Your scout is now running and watching courses 24/7! 🎉

### Development Mode
```bash
# Build the TypeScript
pnpm build

# Run with hot reload
pnpm start
```

## ⚙️ Customize Your Scout

### Change Check Frequency
Want to check every 30 minutes instead of every hour?

```typescript
// In index.ts
const CHECK_INTERVAL_MS = 30 * 60 * 1000; // Check every 30 minutes
```

### Add Your Email
Get notifications sent to your inbox:

```typescript
// In index.ts
const emailAddresses = ['your-email@gmail.com', 'friend@gmail.com'];
```

### Switch to Cloud Mode
Want to run this on the cloud so it never stops?

1. Add Browserbase API keys to `.env`
2. Change `env: "LOCAL"` to `env: "BROWSERBASE"` in `stagehand.config.ts`

## 🔍 How The Magic Works

### 1. Login Process (The Smart Way)
- 🚀 Zooms to PEC website
- 🎯 Clicks "Login with AIS Credentials"
- 🔑 Enters your credentials
- 🤖 AI solves CAPTCHA automatically
- 🛡️ Falls back to manual if needed

### 2. Course Hunting (The Genius Part)
- 📋 Goes to "Add & Drop Courses"
- 🔍 Analyzes EVERY course row
- ✅ Checks checkbox states:
  - `disabled` = ❌ Not available
  - `checked` = ✅ Already selected
  - None = 🎯 **AVAILABLE FOR YOU!**
- 📊 Tracks all the `onclick="chkcontrol0(X)"` patterns

### 3. Smart Reporting (The Beauty)
Sends you beautiful HTML emails with:
- 🎯 Priority course status (CS6701)
- 📊 Complete course table
- ✅/❌ Availability status
- ⏰ Real-time timestamps

## 📊 Course Status Decoder

The scout reads HTML like a pro:

| HTML Attribute | Status | What It Means |
|----------------|--------|---------------|
| `disabled` | ❌ Not Selectable | Course is locked/not available |
| `checked` | ✅ Already Selected | You (or someone) already picked it |
| None | 🎯 **AVAILABLE!** | **GRAB IT NOW!** |

## 🛡️ Built Like a Tank

- **🤖 AI Failures**: Falls back to manual CAPTCHA
- **🌐 Network Issues**: Waits and retries
- **⏰ Session Timeouts**: Auto-logout and restart
- **💪 Bulletproof**: Never gives up

## 📁 What's Inside

```
browser-scout/
├── index.ts              # The main brain 🧠
├── stagehand.config.ts   # Browser settings ⚙️
├── utils.ts              # Helper functions 🛠️
├── llm_clients/          # AI magic 🤖
├── package.json          # Dependencies 📦
└── README.md            # This awesome guide 📖
```

## 🔧 Make It Yours

### Add More Priority Courses
Want to track CS6701 AND other courses?

```typescript
// Add your dream courses here
const priorityCourses = ['CS6701', 'MM6006', 'YOUR_COURSE'];
```

### Custom Email Template
Make the emails look exactly how you want:

```typescript
// Modify the emailBody template in index.ts
```

### Change AI Model
Want to use a different AI for CAPTCHA?

```typescript
// In stagehand.config.ts
modelName: "claude-3-5-sonnet-latest" // or any other model
```

## 🐛 When Things Go Wrong

### CAPTCHA Issues
- ✅ Check OpenAI API key
- ✅ Verify you have API credits
- ✅ Use manual fallback (it'll ask you)

### Login Problems
- ✅ Verify PEC credentials
- ✅ Check if PEC website is up
- ✅ Try manual CAPTCHA input

### Email Not Working
- ✅ Check Resend API key
- ✅ Verify email addresses
- ✅ Check API quotas

### Debug Mode (For Nerds)
```typescript
// In stagehand.config.ts
verbose: 2 // Maximum logging
```

## 📈 What You'll See

The scout gives you detailed logs:
- 🔐 Login attempts and success/failure
- 📊 Course availability changes
- 📧 Email notification status
- ⚠️ Error conditions and recovery

## 🔐 Security First

- 🔒 Store credentials in `.env` (never commit them!)
- 🔑 Use API keys with proper permissions
- 🛡️ Consider secrets management for production
- 🚫 Never share your API keys

## 🤝 Want to Contribute?

1. 🍴 Fork the repo
2. 🌿 Create a feature branch
3. ✏️ Make your changes
4. 🧪 Test thoroughly
5. 📤 Submit a pull request

## 📄 Legal Stuff

This is for **educational and personal use only**. Please respect PEC's terms of service and use responsibly! 

---

**Built with [Stagehand](https://github.com/browserbase/stagehand) - The browser automation SDK that makes this possible!** 🚀

**PEC Students: Your course hunting days are over! 🎯**
