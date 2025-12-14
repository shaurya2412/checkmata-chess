import dotenv from 'dotenv';
dotenv.config({ path: '.env' }); // IMPORTANT
import express from 'express';
import v1Router from './router/v1';
import cors from 'cors';
import { initPassport } from './passport';
import authRoute from './router/auth';
import session from 'express-session';
import passport from 'passport';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { COOKIE_MAX_AGE } from './consts';

// Load .env file - check multiple locations (backend dir, packages/db, or root)
const envPaths = [
  path.resolve(__dirname, '../.env'), // apps/backend/.env (from dist: apps/backend/dist -> apps/backend/.env)
  path.resolve(__dirname, '../../../../packages/db/.env'), // packages/db/.env (from dist: apps/backend/dist -> packages/db/.env)
  path.resolve(__dirname, '../../../../.env'), // root .env (from dist: apps/backend/dist -> root .env)
];

// Try each path and load the first one that exists
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}

// Fallback to default dotenv behavior if none found
if (!process.env.DATABASE_URL) {
  dotenv.config();
}

const app = express();

// ----------------------------------------------------
// CORS CONFIG
// Must be the first middleware. We cannot use "*" when credentials are true.
// ----------------------------------------------------
const allowedHostsEnv = process.env.ALLOWED_HOSTS || 'http://localhost:5173';
const parsedHosts = allowedHostsEnv
  .split(',')
  .map((h) => h.trim())
  .filter(Boolean);

// For development: allow requests from any origin that matches the pattern
// This allows access from other devices on the network (e.g., http://192.168.1.100:5173)
const isDevelopment = process.env.NODE_ENV !== 'production';
const corsOriginFunction = (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
  // Allow requests with no origin (like mobile apps or curl requests)
  if (!origin) {
    return callback(null, true);
  }

  // In development, allow any origin on ports 5173 (frontend) or same hostname
  if (isDevelopment) {
    // Allow localhost and any IP address on port 5173
    if (origin.includes(':5173') || origin.includes('localhost') || origin.match(/^http:\/\/\d+\.\d+\.\d+\.\d+:5173$/)) {
      return callback(null, true);
    }
  }

  // Check against explicitly allowed hosts
  if (parsedHosts.includes('*') || parsedHosts.length === 0) {
    return callback(null, true);
  }

  if (parsedHosts.includes(origin)) {
    return callback(null, true);
  }

  callback(new Error('Not allowed by CORS'));
};

const corsOptions = {
  origin: isDevelopment ? corsOriginFunction : parsedHosts,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// ----------------------------------------------------
app.use(express.json());
app.use(cookieParser());

// ----------------------------------------------------
// Sessions
// ----------------------------------------------------
console.log('DATABASE_URL visible?', !!process.env.DATABASE_URL);

app.use(
  session({
    secret: process.env.COOKIE_SECRET || 'keyboard cat',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
    },
  })
);

// ----------------------------------------------------
// Passport
// ----------------------------------------------------
initPassport();
app.use(passport.initialize());
app.use(passport.session());

// ----------------------------------------------------
// Routes
// ----------------------------------------------------
app.use('/auth', authRoute);
app.use('/v1', v1Router);

// ----------------------------------------------------
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0'; // Listen on all interfaces to allow access from other devices
app.listen(PORT, HOST, () => {
  console.log(`Server is running on http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
  console.log(`Server is accessible from network on port ${PORT}`);
});
