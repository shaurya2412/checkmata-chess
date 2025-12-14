# 🚀 Complete Chess Application Startup Guide

## ✅ Prerequisites Check

- ✅ Docker PostgreSQL running on port 5432
- ✅ Node.js >= 18
- ✅ Yarn package manager
- ✅ Turbo installed

---

## 📋 Step-by-Step Startup

### **Step 1: Setup Database (One-time)**

Run Prisma migrations to set up database schema:

```bash
cd packages/db
npm install
npx prisma migrate deploy
```

Or if you want to reset database (DELETES ALL DATA):

```bash
npx prisma migrate reset
```

---

### **Step 2: Start All Services Together**

From the root directory:

```bash
npm run dev
```

This will start all three services simultaneously in Turbo watch mode:

- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3000 (or check terminal output)
- **WebSocket Server**: ws://localhost:8080

**Terminal Output** will show something like:

```
ws > Running dev in daemon mode
backend > Running dev in daemon mode
frontend > Starting vite dev server...
```

---

## 🎮 Alternative: Start Services Individually

If you need to debug individual services:

### **Terminal 1: WebSocket Server**

```bash
cd apps/ws
npm run dev
# Output: ws server listening on port 8080
```

### **Terminal 2: Backend API**

```bash
cd apps/backend
npm run dev
# Output: Server running on port 3000
```

### **Terminal 3: Frontend**

```bash
cd apps/frontend
npm run dev
# Output: Local: http://localhost:5173/
```

---

## 🌐 Access the Application

Once all services are running:

1. **Open Browser**: http://localhost:5173
2. **You should see**:
   - Landing page with login options
   - Three ways to play:
     - Play vs Human (requires two players)
     - Play vs Bot (AI opponent)
     - Analysis Board (study positions)
   - Login options: Google, GitHub, or Guest

---

## 🧪 Quick Test

### **Test 1: Play as Guest**

1. Click "Play" on landing page
2. Select "Guest" option
3. Play vs Bot (easiest to test alone)
4. Select difficulty level
5. Make moves and see AI respond

### **Test 2: Two Players**

1. Open two browser windows (or incognito)
2. Login as different users (Guest1 and Guest2)
3. First player clicks "Play" → finds game
4. Second player clicks "Play" → joins same game
5. Both can now play against each other

### **Test 3: Analysis Board**

1. Click "Analysis" in sidebar
2. Drag pieces to analyze positions
3. Get engine evaluation and best moves

---

## 🔍 Verify Services Are Running

### **Check WebSocket Server**

```bash
# Should connect without errors
curl http://localhost:8080
# Or check in browser DevTools → Network → WS
```

### **Check Backend**

```bash
curl http://localhost:3000/v1/hello
# Should return something
```

### **Check Frontend**

```
Open http://localhost:5173 in browser
```

---

## 🐛 Troubleshooting

### **Database Connection Error**

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution**: Check PostgreSQL is running:

```bash
docker ps
# Should show postgres container
# If not running:
docker run -e POSTGRES_PASSWORD=mysecretpassword -d -p 5432:5432 postgres
```

### **Port Already in Use**

If port 5173, 3000, or 8080 is already in use:

```bash
# Kill process on port
netstat -ano | findstr :5173  # Find PID
taskkill /PID <PID> /F        # Kill it
```

### **Dependencies Not Installed**

```bash
yarn install
# Or if using npm:
npm install
```

### **Prisma Client Not Generated**

```bash
cd packages/db
npx prisma generate
```

---

## 🏗️ Project Architecture

```
Frontend (React)       ←→  Backend (Express)
    ↓                           ↓
WebSocket Connection  ←→  WebSocket Server (ws)
                               ↓
                          PostgreSQL Database
```

### **Key Ports**

- **5173**: Frontend (Vite dev server)
- **3000**: Backend API (Express)
- **8080**: WebSocket Server
- **5432**: PostgreSQL (Docker)

---

## 📚 Useful Commands

```bash
# Build for production
npm run build

# Run linting
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# View Turbo cache
npm run build -- --verbose

# Reset database
cd packages/db && npx prisma migrate reset
```

---

## ✨ Features to Test

- ✅ Guest Login
- ✅ OAuth Login (Google/GitHub)
- ✅ Create new game
- ✅ Join existing game
- ✅ Play real-time multiplayer
- ✅ AI Bot with 3 difficulty levels
- ✅ Analysis board with evaluation
- ✅ Move history tracking
- ✅ Timer functionality
- ✅ Game end detection
- ✅ Theme switching
- ✅ Responsive design

---

## 🎯 Expected Behavior

### **Multiplayer Game Flow**

1. Player A starts game → "waiting for opponent"
2. Player B joins → both see "game started"
3. Take turns making moves
4. Win/Lose/Draw detected automatically
5. Results saved to database

### **Bot Game Flow**

1. Select difficulty
2. Choose color
3. Play moves
4. AI responds with calculated move
5. Game ends when checkmate/stalemate reached

---

**You're all set! 🎉 Start with `npm run dev` and enjoy!**
