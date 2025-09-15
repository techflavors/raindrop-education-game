# Raindrop Battle - Educational Game

An engaging, colorful educational web game for K-8 students where learning becomes a competitive and fun experience through a raindrop collection battle system.

## 🎯 Game Concept
- Students collect raindrops by answering questions correctly to fill their water cup
- Battle system where students can challenge peers with harder questions  
- Vibrant, animated, kid-friendly interface with water/rain theme
- Supports grades 1-8 with age-appropriate content

## 🏗️ Technical Stack
- **Backend**: Node.js + Express.js + MongoDB
- **Frontend**: React + Framer Motion (planned)
- **Real-time**: WebSocket for live battles and leaderboards
- **Authentication**: JWT-based security

## 🚀 Getting Started

### Prerequisites
- Node.js (version 16 or higher)
- MongoDB (running on localhost:27017)

### Installation

1. Clone the repository
2. Navigate to the project directory
3. Install dependencies:
   ```bash
   npm run install-deps
   ```

4. Set up environment variables:
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. Start MongoDB service (make sure it's running on port 27017)

### Running the Application

**Development Mode:**
```bash
# Start backend server
npm run backend

# In another terminal, start frontend (when ready)
npm run frontend
```

**Production Mode:**
```bash
npm start
```

## 📁 Project Structure
```
raindrop-game/
├── backend/          # Node.js API server
│   ├── src/
│   │   ├── models/   # MongoDB schemas
│   │   ├── routes/   # API endpoints
│   │   ├── middleware/ # Custom middleware
│   │   └── utils/    # Helper functions
│   └── package.json
├── frontend/         # React application (planned)
└── package.json      # Root package.json
```

## 🎮 Game Features (Planned)
- **Admin Module**: System management and user creation
- **Teacher Module**: Question creation with AI assistance
- **Student Module**: Interactive gameplay with animations
- **Battle System**: Real-time peer challenges
- **Progress Tracking**: Individual and class analytics

## 🔧 Development Status
- [x] Project structure setup
- [x] Backend foundation with Express.js
- [x] MongoDB connection and User model
- [x] Security middleware (CORS, helmet, rate limiting)
- [ ] Authentication system (JWT)
- [ ] Admin API endpoints
- [ ] Teacher API endpoints
- [ ] Student API endpoints
- [ ] Frontend React application
- [ ] Game mechanics implementation
- [ ] Battle system with WebSockets

## 🌐 API Endpoints
```
GET  /              - Welcome message
GET  /health        - Health check
POST /api/auth/*    - Authentication endpoints (planned)
POST /api/admin/*   - Admin management (planned)
GET  /api/teacher/* - Teacher features (planned)
GET  /api/student/* - Student gameplay (planned)
```

## 🧪 Testing
```bash
# Run tests (when implemented)
npm test
```

## 📝 License
This project is licensed under the MIT License.
