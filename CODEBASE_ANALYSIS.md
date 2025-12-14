# Chess Platform - Complete Codebase Analysis

## 📋 Project Overview

A full-stack chess platform built as a monorepo using Turborepo. The platform enables users to:
- Sign up via Google, GitHub, or as a guest
- Create/join chess matches
- Play real-time chess games
- Track ratings (similar to standard chess rating systems)

## 🏗️ Architecture

### Monorepo Structure
```
chess/
├── apps/
│   ├── backend/      # Express.js REST API server
│   ├── frontend/     # React + Vite web application
│   ├── ws/           # WebSocket server for real-time games
│   └── native/       # React Native/Expo mobile app
├── packages/
│   ├── db/           # Prisma database package
│   ├── store/        # Shared state management (Recoil)
│   ├── ui/           # Shared UI components
│   ├── typescript-config/  # Shared TypeScript configs
│   ├── eslint-config/      # Shared ESLint configs
│   └── tailwind-Config/    # Shared Tailwind config
```

### Technology Stack

**Frontend:**
- React 18.2.0
- Vite (build tool)
- TypeScript
- TailwindCSS
- Recoil (state management)
- React Router DOM
- chess.js (chess logic)
- Radix UI components

**Backend:**
- Express.js
- TypeScript
- Passport.js (OAuth authentication)
- JWT (token-based auth)
- Cookie sessions

**WebSocket Server:**
- ws library
- chess.js
- JWT authentication
- Real-time game management

**Database:**
- PostgreSQL
- Prisma ORM

**Mobile:**
- React Native
- Expo Router
- chess.js

**Build & Tooling:**
- Turborepo (monorepo management)
- ESLint + Prettier
- Husky (git hooks)
- Yarn workspaces

## 🔑 Key Components

### 1. Backend (`apps/backend/`)

**Main Entry (`src/index.ts`):**
- Express server setup
- CORS configuration
- Session management (express-session)
- Passport authentication middleware
- Routes: `/auth` and `/v1`

**Authentication (`src/router/auth.ts`):**
- `/auth/guest` - Guest user creation
- `/auth/refresh` - Token refresh endpoint
- `/auth/google` - Google OAuth login
- `/auth/github` - GitHub OAuth login
- `/auth/logout` - Logout handler

**Passport Configuration (`src/passport.ts`):**
- Google OAuth 2.0 strategy
- GitHub OAuth strategy
- User upsert logic (create or update on login)
- Session serialization/deserialization

**Current Limitations:**
- `/v1` router is mostly empty (only has a hello world endpoint)
- No game creation/management endpoints
- No user profile endpoints
- No rating calculation endpoints

### 2. WebSocket Server (`apps/ws/`)

**Main Entry (`src/index.ts`):**
- WebSocket server on port 8080
- JWT token extraction from query params
- User authentication on connection
- GameManager initialization

**GameManager (`src/GameManager.ts`):**
- Manages active games in memory
- Handles game matching (pending game queue)
- Message routing:
  - `INIT_GAME` - Create new game or join pending game
  - `MOVE` - Process chess moves
  - `JOIN_ROOM` - Join existing game by ID
  - `EXIT_GAME` - Handle player exit

**Game Class (`src/Game.ts`):**
- Chess game state management using chess.js
- Move validation and execution
- Time tracking (10 minutes per player)
- Abandon timer (60 seconds inactivity)
- Move timer (game time limit)
- Database persistence of moves
- Game end detection (checkmate, draw, timeout, abandonment, player exit)
- Promotion handling (always promotes to queen)

**SocketManager (`src/SocketManager.ts`):**
- Singleton pattern
- Room-based broadcasting
- User-to-room mapping
- Connection management

**Authentication (`src/auth/index.ts`):**
- JWT token verification
- User extraction from token
- User object creation

### 3. Frontend (`apps/frontend/`)

**Main App (`src/App.tsx`):**
- React Router setup
- Routes:
  - `/` - Landing page
  - `/login` - Login page
  - `/game/:gameId` - Game screen
  - `/settings` - Settings page
- Recoil root provider
- Theme provider

**Game Screen (`src/screens/Game.tsx`):**
- WebSocket connection management
- Chess board state management
- Move handling and validation
- Timer display (10 minutes per player)
- Game metadata (players, colors)
- Move history
- Game end modal
- Exit game functionality

**ChessBoard Component (`src/components/ChessBoard.tsx`):**
- Interactive chess board
- Drag and drop piece movement
- Legal move highlighting
- Arrow drawing (right-click)
- Promotion detection
- Sound effects (move, capture)
- Board flipping
- Move history navigation

**State Management:**
- Recoil atoms:
  - `userAtom` - Current user (fetched from `/auth/refresh`)
  - `movesAtom` - Game move history
  - `isBoardFlippedAtom` - Board orientation
  - `userSelectedMoveIndexAtom` - Move history navigation

**Hooks:**
- `useSocket` - WebSocket connection management
- `useUser` - User state access
- `useWindowSize` - Responsive design
- `useThemes` - Theme management

### 4. Database Schema (`packages/db/prisma/schema.prisma`)

**Models:**

1. **User**
   - `id` (UUID)
   - `username` (unique, nullable)
   - `name` (nullable)
   - `email` (unique)
   - `provider` (EMAIL, GOOGLE, GITHUB, GUEST)
   - `password` (nullable, for email auth - not implemented)
   - `rating` (default 1200)
   - `createdAt`, `lastLogin`
   - Relations: `gamesAsWhite`, `gamesAsBlack`

2. **Game**
   - `id` (UUID)
   - `whitePlayerId`, `blackPlayerId`
   - `status` (IN_PROGRESS, COMPLETED, ABANDONED, TIME_UP, PLAYER_EXIT)
   - `result` (WHITE_WINS, BLACK_WINS, DRAW)
   - `timeControl` (CLASSICAL, RAPID, BLITZ, BULLET)
   - `startingFen`, `currentFen`
   - `startAt`, `endAt`
   - `opening`, `event` (nullable)
   - Relations: `moves`, `whitePlayer`, `blackPlayer`

3. **Move**
   - `id` (UUID)
   - `gameId`
   - `moveNumber`
   - `from`, `to` (squares)
   - `before`, `after` (FEN positions)
   - `san` (Standard Algebraic Notation, nullable)
   - `timeTaken` (milliseconds)
   - `comments` (nullable)
   - `createdAt`

**Enums:**
- `GameStatus`, `GameResult`, `TimeControl`, `AuthProvider`

## 🔄 Data Flow

### Game Creation Flow:
1. User clicks "Play" on frontend
2. Frontend sends `INIT_GAME` via WebSocket
3. WebSocket server checks for pending games
4. If no pending game: Creates new Game, adds to pending queue
5. If pending game exists: Joins existing game, creates game in DB
6. Both players receive `INIT_GAME` message with game details
7. Game state synchronized via WebSocket

### Move Flow:
1. User makes move on frontend
2. Frontend validates move locally (chess.js)
3. Frontend sends `MOVE` message via WebSocket
4. WebSocket server validates move and player turn
5. Server updates game state (chess.js)
6. Server saves move to database
7. Server broadcasts move to both players
8. Frontend updates board state

### Authentication Flow:
1. User visits `/login`
2. Clicks Google/GitHub OAuth
3. Redirected to OAuth provider
4. Callback to `/auth/{provider}/callback`
5. Passport creates/updates user in DB
6. Session created, redirect to game
7. Frontend calls `/auth/refresh` to get JWT token
8. Token used for WebSocket authentication

## 🔐 Authentication & Authorization

**Current Implementation:**
- OAuth 2.0 (Google, GitHub)
- Guest authentication (JWT-based)
- Session-based HTTP auth
- JWT-based WebSocket auth
- Cookie-based session storage

**Security Considerations:**
- JWT secret should be in environment variables
- CORS configured for allowed hosts
- Session cookies with max age
- Token passed via WebSocket query params

**Missing Features:**
- Email/password authentication (schema supports it, but not implemented)
- Token refresh mechanism (todos mention this)
- Rate limiting
- Input validation (Zod mentioned but not used)

## 📡 Real-time Communication

**WebSocket Message Types:**
- `INIT_GAME` - Initialize new game
- `MOVE` - Chess move
- `GAME_JOINED` - Successfully joined game
- `GAME_ENDED` - Game finished
- `GAME_ADDED` - Game created, waiting for opponent
- `GAME_ALERT` - Error/alert message
- `GAME_NOT_FOUND` - Game doesn't exist
- `EXIT_GAME` - Player exit request

**Connection Management:**
- One WebSocket connection per user
- Room-based broadcasting
- Automatic cleanup on disconnect
- Reconnection handling (not explicitly implemented)

## 🎨 Frontend Structure

**Screens:**
- `Landing.tsx` - Home page
- `Login.tsx` - Authentication page
- `Game.tsx` - Main game interface
- `Settings.tsx` - User settings

**Components:**
- `ChessBoard.tsx` - Main chess board component
- `ChessSquare.tsx` - Individual square
- `MovesTable.tsx` - Move history display
- `GameEndModal.tsx` - Game result modal
- `UserAvatar.tsx` - Player avatar display
- `Navbar.tsx`, `Footer.tsx` - Layout components
- `themes.tsx` - Theme customization

**Styling:**
- TailwindCSS
- Custom theme system
- Responsive design
- Dark/light theme support

## 🗄️ Backend Structure

**Current State:**
- Minimal REST API (mostly authentication)
- No game management endpoints
- No user profile endpoints
- No rating calculation
- No game history endpoints

**Potential Endpoints Needed:**
- `GET /v1/games` - List user's games
- `GET /v1/games/:id` - Get game details
- `GET /v1/users/:id` - Get user profile
- `GET /v1/users/:id/games` - Get user's game history
- `POST /v1/games` - Create custom game
- `GET /v1/leaderboard` - Rating leaderboard

## 📱 Native App

**Structure:**
- Expo Router for navigation
- Similar chess board implementation
- WebSocket connection (same protocol)
- Shared game logic

**Status:**
- Basic structure exists
- Complex chess board component with contexts
- Not fully integrated with backend

## 📦 Shared Packages

**@repo/db:**
- Prisma client export
- Database migrations
- Shared across backend and WebSocket server

**@repo/store:**
- Recoil atoms
- User state
- Chess board state
- Shared between frontend apps

**@repo/ui:**
- Shared UI components (Button, Card, Code)
- Radix UI based

**@repo/typescript-config:**
- Base TypeScript configurations
- Next.js, React library configs

## ⚠️ Issues & Improvements

### Critical Issues:
1. **No Rating System Implementation**
   - Schema has `rating` field but no calculation logic
   - No rating updates after game completion

2. **Incomplete Backend API**
   - `/v1` router is empty
   - No game history endpoints
   - No user profile endpoints

3. **Time Control Not Configurable**
   - Hardcoded to 10 minutes (CLASSICAL)
   - Schema supports different time controls but not used

4. **No Input Validation**
   - Zod mentioned in comments but not used
   - No validation on WebSocket messages
   - No validation on REST endpoints

5. **Error Handling**
   - Minimal error handling
   - No error boundaries in React
   - WebSocket errors not properly handled

6. **Security Concerns**
   - JWT secret fallback to default value
   - No rate limiting
   - No input sanitization
   - WebSocket messages not validated

### Code Quality Issues:
1. **Type Safety**
   - Some `@ts-ignore` comments
   - Missing type definitions
   - `any` types in several places

2. **Code Duplication**
   - `isPromoting` function duplicated in frontend and backend
   - Move handling logic duplicated
   - Timer logic could be shared

3. **Hardcoded Values**
   - Game time hardcoded (10 minutes)
   - Abandon timeout hardcoded (60 seconds)
   - Backend URL hardcoded in store

4. **Missing Features:**
   - No Redis implementation (mentioned in README)
   - No move queue system
   - No game replay functionality
   - No analysis features
   - No chat functionality

### Architecture Improvements:
1. **Separation of Concerns**
   - Game logic mixed with WebSocket handling
   - Business logic in components

2. **State Management**
   - Some state in components that should be in store
   - Timer state management could be improved

3. **Error Recovery**
   - No reconnection logic
   - No offline handling
   - No game state recovery

4. **Testing**
   - No test files found
   - No test setup

## 🚀 Deployment Considerations

**Environment Variables Needed:**
- `DATABASE_URL` - PostgreSQL connection
- `COOKIE_SECRET` - Session encryption
- `JWT_SECRET` - Token signing
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`
- `AUTH_REDIRECT_URL` - OAuth callback URL
- `ALLOWED_HOSTS` - CORS allowed origins
- `PORT` - Backend port (default 3000)
- `VITE_APP_WS_URL` - WebSocket URL (frontend)

**Infrastructure:**
- PostgreSQL database
- Node.js runtime
- WebSocket server (port 8080)
- Static file hosting (frontend)

## 📊 Summary

**Strengths:**
- Clean monorepo structure
- Modern tech stack
- Real-time game functionality working
- Good separation of concerns (apps/packages)
- TypeScript throughout
- Modern React patterns

**Weaknesses:**
- Incomplete backend API
- Missing rating system
- No input validation
- Limited error handling
- Hardcoded values
- No testing infrastructure
- Security improvements needed

**Recommendations:**
1. Implement rating calculation system
2. Complete backend REST API
3. Add input validation (Zod)
4. Implement proper error handling
5. Add comprehensive testing
6. Improve security (rate limiting, input sanitization)
7. Add Redis for move queue (as mentioned in README)
8. Make time controls configurable
9. Add game replay functionality
10. Implement proper reconnection logic

## 📝 File Count Summary

- **Backend:** ~5 main files
- **WebSocket Server:** ~6 main files
- **Frontend:** ~30+ components, screens, hooks
- **Native App:** Complex chess board implementation
- **Shared Packages:** 5 packages
- **Database:** 1 schema file, 10 migrations

---

*Analysis completed on: $(date)*
*Total lines of code: ~5000+ (estimated)*




