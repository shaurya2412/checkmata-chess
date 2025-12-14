import fetch from 'node-fetch';
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GithubStrategy = require('passport-github2').Strategy;
import passport from 'passport';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { db } from './db';

interface GithubEmailRes {
  email: string;
  primary: boolean;
  verified: boolean;
  visibility: 'private' | 'public';
}

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
if (!process.env.DATABASE_URL && !process.env.GOOGLE_CLIENT_ID) {
  dotenv.config();
}
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'your_google_client_id';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'your_google_client_secret';
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || 'your_github_client_id';
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || 'your_github_client_secret';

export function initPassport() {
  if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
    throw new Error('Missing environment variables for authentication providers');
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: '/auth/google/callback',
      },
      async function (accessToken: string, refreshToken: string, profile: any, done: (error: any, user?: any) => void) {
        const user = await db.user.upsert({
          create: {
            email: profile.emails[0].value,
            name: profile.displayName,
            provider: 'GOOGLE',
          },
          update: {
            name: profile.displayName,
          },
          where: {
            email: profile.emails[0].value,
          },
        });

        done(null, user);
      }
    )
  );

  passport.use(
    new GithubStrategy(
      {
        clientID: GITHUB_CLIENT_ID,
        clientSecret: GITHUB_CLIENT_SECRET,
        callbackURL: '/auth/github/callback',
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const res = await fetch('https://api.github.com/user/emails', {
            headers: {
              Authorization: `token ${accessToken}`,
              Accept: 'application/vnd.github+json',
            },
          });

          const emails: GithubEmailRes[] = await res.json();

          const primaryEmail =
            emails.find((e) => e.primary && e.verified)?.email || emails.find((e) => e.verified)?.email;

          if (!primaryEmail) {
            return done(new Error('No verified GitHub email found'));
          }

          const user = await db.user.upsert({
            where: { email: primaryEmail },
            update: {
              name: profile.displayName || profile.username,
            },
            create: {
              email: primaryEmail,
              name: profile.displayName || profile.username,
              provider: 'GITHUB',
            },
          });

          done(null, user);
        } catch (err) {
          done(err);
        }
      }
    )
  );

  passport.serializeUser(function (user: any, cb) {
    process.nextTick(function () {
      return cb(null, {
        id: user.id,
        username: user.username,
        picture: user.picture,
      });
    });
  });

  passport.deserializeUser(function (user: any, cb) {
    process.nextTick(function () {
      return cb(null, user);
    });
  });
}
