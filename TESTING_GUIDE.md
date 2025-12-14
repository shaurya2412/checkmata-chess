# Testing Guide: AI Chess Engine & Analysis Board

## 🚀 Quick Start

### Step 1: Start the Frontend Server

```bash
cd apps/frontend
npm run dev
```

The frontend should start on `http://localhost:5173` (or another port if 5173 is taken)

### Step 2: Open in Browser

Open your browser and navigate to: `http://localhost:5173`

---

## 🧪 Testing Feature 1: AI Bot Game

### Test Path 1: Through Landing Page

1. **Navigate to Landing Page**
   - Go to `http://localhost:5173/`
   - You should see the landing page with game mode options

2. **Click "Computer" Option**
   - Find the "Computer" card (should NOT be disabled anymore)
   - Click on it
   - You should be redirected to `/bot-difficulty`

3. **Select Difficulty Level**
   - You should see 3 difficulty options:
     - **Easy** - Depth: 5
     - **Medium** - Depth: 10
     - **Hard** - Depth: 15
   - Click on any difficulty (e.g., "Medium")
   - You should be redirected to `/game/bot-medium`

4. **Play Against AI**
   - The game should start automatically
   - You should see:
     - Chess board in the center
     - Your avatar and timer on top
     - AI avatar and timer on bottom
     - "AI is thinking..." or "Your turn" message
   - **Make a move** by clicking a piece and then clicking a destination square
   - **Wait for AI response** (should take 1-3 seconds)
   - AI should make a move automatically
   - Continue playing until checkmate or draw

### Test Path 2: Direct URL

1. **Navigate directly to bot game:**
   - Go to `http://localhost:5173/game/bot-easy`
   - Or `http://localhost:5173/game/bot-medium`
   - Or `http://localhost:5173/game/bot-hard`

2. **Verify game starts:**
   - Game should initialize
   - If you're logged in, you'll see your name
   - If not logged in, you'll be redirected to login

### What to Check:

✅ **Difficulty Selection Screen Appears**
- Three difficulty options visible
- "Analysis Board" option also visible

✅ **Game Initializes**
- Chess board renders correctly
- Player avatars show
- Timers start counting down

✅ **AI Makes Moves**
- After you make a move, AI responds within 1-3 seconds
- AI moves are valid chess moves
- Board updates correctly

✅ **Game End Detection**
- Checkmate detection works
- Draw detection works
- Game end modal appears

✅ **Exit Game**
- "Exit" button works
- Returns to landing page

---

## 📊 Testing Feature 2: Analysis Board

### Test Path 1: Through Difficulty Selector

1. **Go to Difficulty Selector**
   - Navigate to `/bot-difficulty`
   - Or click "Computer" from landing page

2. **Click "Analysis Board"**
   - Should be at the bottom with green border
   - Click on it
   - Redirects to `/analysis`

### Test Path 2: Direct URL

1. **Navigate directly:**
   - Go to `http://localhost:5173/analysis`

### Test Path 3: Through Sidebar

1. **Open Sidebar** (if visible)
2. **Click "Analysis"** link
3. **Should navigate to analysis board**

### What to Test:

#### 1. **Initial State**
✅ Analysis board loads
✅ Empty board (starting position)
✅ Evaluation shows "0.00" or close to it
✅ "Best Move" section may be empty initially

#### 2. **Make Moves**
✅ Click a piece and move it
✅ Board updates
✅ Evaluation updates (may take 1-2 seconds)
✅ Best move suggestion appears
✅ Move appears in move history

#### 3. **Position Evaluation**
✅ Evaluation bar shows:
   - Green for White advantage
   - Red for Black advantage
   - Centered for equal position
✅ Numerical evaluation updates
✅ Text description updates ("White is better", etc.)

#### 4. **Best Move Display**
✅ Best move shows in format like "e2e4"
✅ Updates when position changes

#### 5. **Undo Functionality**
✅ Click "Undo" button
✅ Last move is removed
✅ Board returns to previous position
✅ Evaluation updates

#### 6. **Reset Functionality**
✅ Click "Reset" button
✅ Board returns to starting position
✅ All moves cleared
✅ Evaluation resets

#### 7. **Game Status**
✅ Shows current turn (White/Black)
✅ Detects check ("Check!" message)
✅ Detects checkmate ("Checkmate!" message)
✅ Detects draw ("Draw" message)
✅ Detects stalemate ("Stalemate" message)

#### 8. **Move History**
✅ Moves appear in notation (e.g., "1. e4 e5")
✅ Scrollable if many moves
✅ Proper formatting

---

## 🐛 Troubleshooting

### Issue: "Stockfish not loaded" error

**Solution:**
- Check browser console for errors
- Stockfish.js should load automatically
- If it fails, it will try to load from CDN
- Refresh the page

### Issue: AI not making moves

**Check:**
1. Browser console for errors
2. Network tab for failed requests
3. Make sure you made a valid move first
4. Wait a few seconds (AI needs time to calculate)

### Issue: Analysis board not evaluating

**Check:**
1. Click "Analyze Position" button manually
2. Check browser console
3. Wait 2-3 seconds for evaluation
4. Make sure you're on a valid position

### Issue: Routes not working

**Check:**
1. Make sure frontend server is running
2. Check URL is correct
3. Try refreshing the page
4. Check browser console for React errors

### Issue: "Cannot find module" errors

**Solution:**
```bash
cd apps/frontend
npm install
```

---

## ✅ Complete Test Checklist

### Bot Game:
- [ ] Landing page shows "Computer" option enabled
- [ ] Clicking "Computer" goes to difficulty selector
- [ ] All three difficulty levels are visible
- [ ] Selecting difficulty starts game
- [ ] Chess board renders correctly
- [ ] Can make moves as White
- [ ] AI responds with valid moves
- [ ] Timer counts down
- [ ] Game end detection works
- [ ] Exit button works

### Analysis Board:
- [ ] Can navigate to `/analysis`
- [ ] Board renders correctly
- [ ] Can make moves
- [ ] Evaluation updates
- [ ] Best move appears
- [ ] Undo works
- [ ] Reset works
- [ ] Move history displays
- [ ] Game status updates correctly
- [ ] Check/Checkmate detection works

---

## 🎯 Expected Behavior

### Bot Game:
- **Easy**: AI makes reasonable but not perfect moves (depth 5)
- **Medium**: AI makes good moves (depth 10)
- **Hard**: AI makes very strong moves (depth 15)
- Response time: 1-3 seconds per move

### Analysis Board:
- Evaluation updates within 1-2 seconds
- Best move appears after analysis
- All moves are valid chess moves
- UI is responsive and intuitive

---

## 📝 Notes

- **First Load**: Stockfish.js may take a few seconds to initialize
- **AI Thinking**: "AI is thinking..." message appears during calculation
- **Evaluation**: May show "..." while calculating
- **Browser**: Works best in Chrome, Firefox, or Edge
- **Performance**: Analysis may be slower on older devices

---

## 🎉 Success Criteria

If all these work, your features are successfully implemented:
1. ✅ Can play against AI at different difficulty levels
2. ✅ AI makes valid moves and responds appropriately
3. ✅ Analysis board evaluates positions correctly
4. ✅ Best move suggestions appear
5. ✅ Undo/Reset functionality works
6. ✅ UI is responsive and user-friendly

Happy Testing! 🚀




