import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load .env file - check multiple locations (ws dir, packages/db, or root)
const envPaths = [
  path.resolve(__dirname, '../.env'), // apps/ws/.env
  path.resolve(__dirname, '../../../../packages/db/.env'), // packages/db/.env
  path.resolve(__dirname, '../../../../.env'), // root .env
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

import { WebSocketServer } from 'ws';
import { GameManager } from './GameManager';
import url from 'url';
import { extractAuthUser } from './auth';

const wss = new WebSocketServer({ port: 8080 });

const gameManager = new GameManager();

wss.on('connection', function connection(ws, req) {
  //@ts-ignore
  const token: string = url.parse(req.url, true).query.token;
  const user = extractAuthUser(token, ws);
  gameManager.addUser(user);

  ws.on('close', () => {
    gameManager.removeUser(ws);
  });
});

console.log('done');
