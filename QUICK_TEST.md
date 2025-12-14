# Quick Testing Guide

## 🚀 Start the Application

I've started the dev server for you! It should be running in the background.

**Open your browser and go to:** `http://localhost:5173`

(If that port is taken, check the terminal output for the actual port number)

---

## ✅ Test 1: AI Bot Game (2 minutes)

### Steps:
1. **On the landing page**, click the **"Computer"** card
2. **Select a difficulty** (Easy, Medium, or Hard)
3. **Make a move** - Click a piece, then click where to move it
4. **Wait 1-3 seconds** - AI will respond automatically
5. **Continue playing** - Make more moves and watch AI respond

### What to verify:
- ✅ Game starts automatically
- ✅ You can make moves
- ✅ AI responds with valid moves
- ✅ Timer is counting down
- ✅ Game detects checkmate/draw

---

## ✅ Test 2: Analysis Board (2 minutes)

### Steps:
1. **Navigate to Analysis Board:**
   - Option A: Click "Analysis" in the sidebar (if visible)
   - Option B: Go to `/bot-difficulty` and click "Analysis Board"
   - Option C: Go directly to `http://localhost:5173/analysis`

2. **Make some moves:**
   - Click a piece and move it
   - Watch the evaluation update (takes 1-2 seconds)

3. **Check the features:**
   - See the evaluation bar and number
   - See the best move suggestion
   - Try the "Undo" button
   - Try the "Reset" button

### What to verify:
- ✅ Board loads correctly
- ✅ Can make moves
- ✅ Evaluation updates (shows numbers like +0.50 or -1.20)
- ✅ Best move appears (like "e2e4")
- ✅ Undo removes last move
- ✅ Reset clears the board

---

## 🐛 If Something Doesn't Work

### Check Browser Console:
- Press `F12` to open developer tools
- Look for red errors in the Console tab
- Share any errors you see

### Common Issues:

**"Cannot find module"**
```bash
cd apps/frontend
npm install
```

**Page not loading**
- Make sure the dev server is running
- Check the terminal for the correct port
- Try refreshing the page

**AI not responding**
- Wait 3-5 seconds (AI needs time to calculate)
- Check browser console for errors
- Make sure you made a valid move first

**Analysis not working**
- Click "Analyze Position" button manually
- Wait 2-3 seconds for evaluation
- Check browser console

---

## 📋 Quick Checklist

### Bot Game:
- [ ] Can click "Computer" on landing page
- [ ] Difficulty selector appears
- [ ] Game starts after selecting difficulty
- [ ] Can make moves
- [ ] AI responds with moves
- [ ] Timer works

### Analysis Board:
- [ ] Can navigate to `/analysis`
- [ ] Can make moves on board
- [ ] Evaluation updates
- [ ] Best move appears
- [ ] Undo works
- [ ] Reset works

---

## 🎯 Expected Results

**Bot Game:**
- Easy: AI makes basic moves
- Medium: AI makes good moves
- Hard: AI makes strong moves
- Response time: 1-3 seconds

**Analysis Board:**
- Evaluation: Shows numbers like +0.50 (White better) or -1.20 (Black better)
- Best Move: Shows move like "e2e4"
- Updates: Happen within 1-2 seconds

---

**That's it! If both features work, you're all set! 🎉**




