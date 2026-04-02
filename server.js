require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const { socketAuth } = require('./middleware/auth');
const locationHandler = require('./socket/locationHandler');
const chatHandler = require('./socket/chatHandler');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const rideRoutes = require('./routes/rides');
const broadcastRoutes = require('./routes/broadcasts');
const eventRoutes = require('./routes/events');
const messageRoutes = require('./routes/messages');

const app = express();
const server = http.createServer(app);

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// ── Middleware ───────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
const uploadsDir = path.join(__dirname, 'uploads/avatars');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── API Routes ──────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/broadcasts', broadcastRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/messages', messageRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    name: 'MotoRide API',
    version: '1.0.0',
    uptime: process.uptime()
  });
});

// ── Serve MotoRide Web App ──────────────────────────────────
const publicDir = path.join(__dirname, 'public');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
  // SPA fallback
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'Endpoint tapılmadı.' });
    }
    res.sendFile(path.join(publicDir, 'index.html'));
  });
} else {
  app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint tapılmadı.' });
  });
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Daxili server xətası.' });
});

// ── Socket.io Authentication & Handlers ─────────────────────
io.use(socketAuth);

const { activeUsers } = locationHandler(io);
chatHandler(io, activeUsers);

// ── MongoDB Connection & Server Start ───────────────────────
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/motoride';

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB bağlantısı uğurlu');
    server.listen(PORT, '0.0.0.0', () => {
      const hasWeb = fs.existsSync(publicDir);
      console.log(`
╔══════════════════════════════════════════════╗
║          🏍️  MotoRide Server                ║
║                                              ║
║  API:    http://0.0.0.0:${PORT}/api            ║
║  Web:    ${hasWeb ? `http://0.0.0.0:${PORT}` : 'Not built'}              ║
║  Socket: ws://0.0.0.0:${PORT}                  ║
║  Status: Ready (📱 Web + API + Socket.io)     ║
╚══════════════════════════════════════════════╝
      `);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB bağlantı xətası:', err.message);
    process.exit(1);
  });

module.exports = { app, server, io };
