import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { getLocalIpAddress } from './utils/ipHelper.js';
import { LobbyManager } from './lobby/lobbyManager.js';
import { setupSocketHandler } from './network/socketHandler.js';
import { ClientToServerEvents, ServerToClientEvents } from '@agefront/shared';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// Origin validator: restrict cross-origin requests to local network subnets
const isAllowedLanOrigin = (origin?: string): boolean => {
  if (!origin) return true; // Direct same-origin requests or native clients
  try {
    const url = new URL(origin);
    const host = url.hostname;
    return (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host.startsWith('192.168.') ||
      host.startsWith('10.') ||
      host.startsWith('172.') ||
      host.endsWith('.local') ||
      host.endsWith('.onrender.com') ||
      host.endsWith('.render.com') ||
      Boolean(process.env.RENDER) ||
      Boolean(process.env.ALLOWED_ORIGINS?.split(',').includes(host))
    );
  } catch {
    return false;
  }
};

// Security and privacy headers
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});

app.use(cors({
  origin: (origin, callback) => {
    if (isAllowedLanOrigin(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Cross-origin request blocked by LAN privacy policy'));
    }
  }
}));
app.use(express.json());

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = '0.0.0.0';
const localIp = getLocalIpAddress();
const lobbyManager = new LobbyManager(`http://${localIp}:${PORT}`);

// API endpoint for host network information (restricted to localhost to prevent reconnaissance)
app.get('/api/info', (req, res) => {
  const remoteIp = req.socket.remoteAddress || '';
  const isLoopback = remoteIp === '127.0.0.1' || remoteIp === '::1' || remoteIp.endsWith('127.0.0.1');
  if (!isLoopback) {
    return res.status(403).json({ error: 'Access to host network information is restricted to localhost.' });
  }
  res.json({
    ip: localIp,
    port: PORT,
    lanUrl: `http://${localIp}:${PORT}`,
    localUrl: `http://localhost:${PORT}`
  });
});

// API endpoint for active match rooms
app.get('/api/rooms', (_req, res) => {
  res.json(lobbyManager.getActiveRoomsList());
});

// Serve client static build
const clientDistPath = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
} else {
  app.get('/', (_req, res) => {
    res.send(`
      <html>
        <head><title>Agefront: Nations at War</title></head>
        <body style="font-family: sans-serif; background: #0f172a; color: #f8fafc; padding: 40px; text-align: center;">
          <h1>Agefront: Nations at War — Server Running</h1>
          <p>Local URL: <a href="http://localhost:${PORT}" style="color: #38bdf8;">http://localhost:${PORT}</a></p>
          <p>LAN Address: <strong style="color: #4ade80;">http://${localIp}:${PORT}</strong></p>
          <p>Client build not yet compiled. Run <code>npm run build</code> to generate the client frontend.</p>
        </body>
      </html>
    `);
  });
}

// Initialize Socket.IO with LAN origin protection
const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: {
    origin: (origin, callback) => {
      if (isAllowedLanOrigin(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Socket.IO connection blocked by LAN privacy policy'));
      }
    },
    methods: ['GET', 'POST']
  }
});

setupSocketHandler(io, lobbyManager);

server.listen(PORT, HOST, () => {
  console.log(`
==================================================================
           AGEFRONT: NATIONS AT WAR — LAN MULTIPLAYER
==================================================================
  Server Status: ONLINE
  Local Access:  http://localhost:${PORT}
  LAN Access:    http://${localIp}:${PORT}

  INSTRUCTIONS FOR LAN PLAY:
  1. Share the LAN Access URL above with friends on the same Wi-Fi/LAN.
  2. If friends cannot reach the page, ensure Windows Defender Firewall
     allows Node.js / port ${PORT}.
  3. To verify your IP on Windows, open Command Prompt and run 'ipconfig'.
==================================================================
  `);
});
