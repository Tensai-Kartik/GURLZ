# GURLZ Wellness AI

A production-quality, cross-platform, voice-first period companion app with Gemini-powered conversational AI, local SQLite persistence, Spotify integration, and a beautiful baby-pink themed UI.

## 🎨 Features

- **Voice-First Interface**: Animated voice orb with multiple states (idle, listening, thinking, speaking)
- **Gemini AI Integration**: Multiple API key rotation with automatic failover
- **Local SQLite Database**: All data persisted locally with Prisma ORM
- **Spotify Integration**: Curated playlists and music recommendations
- **Cycle Tracking**: Track periods, symptoms, and moods
- **Personal Diary**: Encrypted diary entries for privacy
- **Emergency SOS**: Quick access to emergency contacts
- **Partner Integrations**: Links to Swiggy, Zomato, Blinkit, Zepto, JioMart
- **Baby-Pink Theme**: Beautiful, feminine UI with gradients and animations

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- npm or yarn
- Docker (optional, for containerized setup)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd gurlz-miniproject
```

2. Install dependencies:
```bash
npm install
cd backend && npm install
cd ../frontend && npm install
```

3. Set up environment variables:

Create `backend/.env`:
```env
DATABASE_URL="file:./data/gurlz.db"
PORT=3001
NODE_ENV=development
JWT_SECRET=your-super-secret-jwt-key
GEMINI_KEYS=key1,key2,key3
DEMO_MODE=true
```

Create `frontend/.env`:
```env
VITE_API_URL=http://localhost:3001
```

4. Initialize database:
```bash
cd backend
npm run migrate
npm run seed
```

5. Start development servers:

**Option 1: Using npm scripts (recommended)**
```bash
# From root directory
npm run dev
```

This starts both backend (port 3001) and frontend (port 5173) concurrently.

**Option 2: Separate terminals**
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

**Option 3: Docker Compose**
```bash
docker-compose up --build
```

6. Open your browser:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- Health Check: http://localhost:3001/health

## 🔑 Gemini API Keys Setup

The app supports multiple Gemini API keys for rotation and failover:

1. Get your Gemini API keys from [Google AI Studio](https://makersuite.google.com/app/apikey)

2. Add keys to `backend/.env`:
```env
GEMINI_KEYS=your-key-1,your-key-2,your-key-3
```

3. The system will:
   - Rotate keys in round-robin fashion
   - Automatically blacklist keys on 401/429 errors
   - Retry with exponential backoff
   - Log usage to the database

4. Check key status:
```bash
curl http://localhost:3001/metrics
```

## 📊 Database Schema

The app uses SQLite with the following tables:

- `users` - User accounts
- `cycles` - Menstrual cycle tracking
- `symptoms` - Symptom logging
- `reminders` - Scheduled reminders
- `diary` - Encrypted diary entries
- `notes` - Quick notes
- `emergency_contacts` - Emergency contact information
- `sos_events` - SOS event logs
- `orders` - Order history (mocked/real)
- `logs` - System logs including Gemini usage

## 🎤 Voice Features

### STT (Speech-to-Text)
- Default: Vosk.js (browser-based)
- Alternative: Whisper.cpp
- Set via `STT_PROVIDER` environment variable

### TTS (Text-to-Speech)
- Default: Coqui TTS
- Alternative: Piper TTS
- Set via `TTS_PROVIDER` environment variable

## 🎵 Spotify Integration

The Music panel includes curated playlists that open in Spotify:
- Click any playlist to open in Spotify web/app
- Playlists are configured in `frontend/src/components/MusicPanel.tsx`

## 🔒 Privacy & Security

- **Diary Encryption**: All diary entries are encrypted locally using AES-256-GCM
- **Local Storage**: All data stored in SQLite on your device
- **No External Tracking**: No analytics or tracking by default
- **JWT Authentication**: Secure token-based authentication

## 🧪 Testing

Run acceptance tests:
```bash
npm run test:acceptance
```

## 📱 Responsive Design

The app is fully responsive and works on:
- Desktop (full three-column layout)
- Tablet (adaptive layout)
- Mobile (stacked layout)

## 🛠 Tech Stack

### Backend
- Node.js 20+ with TypeScript
- Fastify (web framework)
- Prisma (ORM)
- SQLite (database)
- Google Gemini AI

### Frontend
- React 18
- Vite
- TypeScript
- TailwindCSS
- Zustand (state management)
- React Query (server state)

## 📝 API Endpoints

- `POST /auth/login` - User login
- `GET /me` - Get current user
- `GET /cycles` - Get cycles
- `POST /cycles` - Create cycle
- `POST /chat` - Chat with AI (supports streaming)
- `GET /chat/history` - Get chat history
- `POST /symptoms` - Log symptoms
- `POST /reminders` - Create reminder
- `GET /diary` - Get diary entries
- `POST /diary` - Create diary entry
- `POST /sos` - Trigger SOS alert
- `GET /funfacts` - Get daily myth/fact
- `GET /health` - Health check
- `GET /metrics` - Gemini key metrics

See `backend/src/routes/` for complete API documentation.

## 🎨 Theme Customization

The baby-pink theme uses CSS variables defined in `frontend/src/index.css`:

```css
--bg: #FFF6FA;
--card: #FFF1F6;
--primary: #FFABC9;
--accent: #FF6FA3;
--muted: #8E6A7F;
```

## 🐛 Troubleshooting

### Database Issues
```bash
cd backend
rm -rf data/gurlz.db
npm run migrate
npm run seed
```

### Port Already in Use
Change ports in:
- `backend/.env` (PORT)
- `frontend/vite.config.ts` (server.port)

### Gemini API Errors
- Check API keys are valid
- Verify keys are comma-separated in `.env`
- Check `/metrics` endpoint for key status
- Enable `DEMO_MODE=true` for testing without keys

## 📄 License

This project is private and proprietary.

## 🙏 Acknowledgments

- Google Gemini AI
- Spotify API
- Prisma ORM
- Fastify Framework

---

Built with ❤️ for women's wellness

