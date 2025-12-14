# 🎮 How to Test a 1 vs 1 Chess Match

## 📋 Prerequisites

Before starting, make sure all services are running:

1. **Database**: PostgreSQL should be running on port 5432
2. **All Services**: Start from the root directory:
   ```bash
   npm run dev
   ```
   
   This starts:
   - Frontend: http://localhost:5173
   - Backend: http://localhost:3000
   - WebSocket Server: ws://localhost:8080

---

## 🎯 Step-by-Step Guide to Start a 1 vs 1 Match

### **Step 1: Start the Application**

From the root directory (`chessy/`), run:
```bash
npm run dev
```

Wait until you see all services running. You should see output like:
```
frontend > Starting vite dev server...
backend > Server running on port 3000
ws > ws server listening on port 8080
```

---

### **Step 2: Player 1 - Create a Game**

1. **Open Browser Window 1** (or regular browser)
   - Navigate to: `http://localhost:5173`

2. **Login** (if not already logged in)
   - Click "Play" on the landing page
   - Choose "Guest" or login with Google/GitHub
   - You'll be redirected to `/game/random`

3. **Start a New Game**
   - You should see a "Play" button on the right side
   - Click the **"Play"** button
   - This sends an `INIT_GAME` message to create a new game

4. **Wait for Game Creation**
   - After clicking "Play", you'll see:
     - "Wait opponent will join soon..." message
     - A shareable game link (e.g., `http://localhost:5173/game/1fe65602-1141-4da3-9e66-27fdcb88e270`)
     - "Copy the link" button

5. **Copy the Game Link**
   - Click the **"Copy the link"** button (or manually copy the URL)
   - The link will be copied to your clipboard

---

### **Step 3: Player 2 - Join the Game**

1. **Open Browser Window 2** (or incognito/private window)
   - This simulates a different player
   - **Important**: Use a different browser window/profile or incognito mode

2. **Login as a Different User**
   - Navigate to: `http://localhost:5173`
   - Login as Guest (or different account)
   - This ensures you're logged in as a different user

3. **Join Using the Game Link**
   - Paste the game link you copied from Player 1
   - Navigate to: `http://localhost:5173/game/{gameId}`
   - Example: `http://localhost:5173/game/1fe65602-1141-4da3-9e66-27fdcb88e270`

4. **Game Should Start Automatically**
   - When Player 2 joins, the game will start automatically
   - Both players will see:
     - The chess board with pieces
     - Player avatars and names
     - Timers counting down (10 minutes per player)
     - "Your turn" or "Opponent's turn" message

---

### **Step 4: Play the Game**

1. **Make Moves**
   - Click on a piece to select it
   - Click on a valid destination square to move
   - Moves are synchronized in real-time via WebSocket

2. **Take Turns**
   - White moves first (Player 1)
   - Black moves second (Player 2)
   - The game alternates turns automatically

3. **Watch the Game**
   - Both players see the same board state
   - Move history appears on the right side
   - Timers count down for each player

---

### **Step 5: End the Game**

The game ends when:
- **Checkmate**: One player checkmates the other
- **Draw**: Stalemate or other draw conditions
- **Timeout**: A player runs out of time
- **Player Exit**: A player clicks "Exit Game"

When the game ends:
- A modal appears showing the result
- Both players see who won and why
- The game is saved to the database

---

## 🔄 Alternative: Using "Play Online" Feature

You can also use the "Play Online" feature which automatically matches players:

1. **Player 1**: 
   - Go to `http://localhost:5173`
   - Click "Play Online" card
   - Navigate to `/game/random`
   - Click "Play" button
   - Wait for matchmaking

2. **Player 2**:
   - Open a different browser/incognito window
   - Go to `http://localhost:5173`
   - Click "Play Online" card
   - Navigate to `/game/random`
   - Click "Play" button
   - The system will match you with Player 1's pending game

---

## ✅ What to Verify

### **Before Game Starts:**
- ✅ Player 1 sees "Wait opponent will join soon..."
- ✅ Shareable link is displayed
- ✅ Link can be copied to clipboard

### **When Player 2 Joins:**
- ✅ Game starts automatically
- ✅ Both players see the chess board
- ✅ Player names/avatars are displayed correctly
- ✅ Timers start counting down
- ✅ Turn indicator shows correctly

### **During the Game:**
- ✅ Moves are synchronized between both players
- ✅ Only the player whose turn it is can make moves
- ✅ Move history updates for both players
- ✅ Timers count down correctly
- ✅ Invalid moves are rejected

### **Game End:**
- ✅ Checkmate/draw is detected correctly
- ✅ Game end modal appears
- ✅ Results are displayed correctly
- ✅ Game is saved to database

---

## 🐛 Troubleshooting

### **Issue: Player 2 can't join the game**

**Solutions:**
1. Make sure Player 2 is logged in as a different user
2. Check that the game link is correct (copy it again)
3. Verify WebSocket server is running (check terminal)
4. Check browser console for errors (F12)

### **Issue: "Game not found" error**

**Solutions:**
1. The game might have expired or been removed
2. Create a new game and try again
3. Check that the gameId in the URL is correct

### **Issue: Moves not synchronizing**

**Solutions:**
1. Check WebSocket connection in browser DevTools (Network → WS)
2. Verify both players are connected
3. Refresh both browser windows
4. Check backend/websocket server logs for errors

### **Issue: Can't see the "Play" button**

**Solutions:**
1. Make sure you're on `/game/random` route
2. Check that you're logged in
3. Refresh the page

---

## 📝 Quick Reference

### **Routes:**
- `/game/random` - Create or join a random match
- `/game/{gameId}` - Join a specific game by ID

### **WebSocket Messages:**
- `INIT_GAME` - Create a new game
- `JOIN_ROOM` - Join an existing game
- `MOVE` - Send a move
- `EXIT_GAME` - Leave the game

### **Key Files:**
- `apps/frontend/src/screens/Game.tsx` - Main game screen
- `apps/ws/src/GameManager.ts` - WebSocket game logic
- `apps/frontend/src/components/ShareGame.tsx` - Share game component

---

## 🎉 Success!

If you can:
1. ✅ Create a game as Player 1
2. ✅ Share the link
3. ✅ Join as Player 2
4. ✅ Make moves that sync between both players
5. ✅ See game end correctly

Then your 1 vs 1 match feature is working perfectly! 🚀



