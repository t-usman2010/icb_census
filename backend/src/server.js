require('dotenv').config();

const path = require('node:path');
const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const { censusRouter } = require('./routes/census');
const { adminRouter } = require('./routes/admin');
const { errorHandler } = require('./middleware/error-handler');

const app = express();
const port = Number(process.env.PORT) || 4000;

// Security headers with CSP configured for admin console CDNs
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://cdn.tailwindcss.com',
          'https://cdnjs.cloudflare.com'
        ],
        scriptSrcAttr: ["'unsafe-inline'"],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://fonts.googleapis.com',
          'https://cdnjs.cloudflare.com'
        ],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://cdnjs.cloudflare.com'],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'"]
      }
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

// CORS configuration supporting frontend SPA
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN
      ? process.env.CLIENT_ORIGIN.split(',').map((o) => o.trim())
      : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true
  })
);

app.use(cookieParser());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Static file hosting
app.use('/uploads', express.static(path.resolve(process.env.UPLOAD_DIR || 'uploads')));
app.use('/admin', express.static(path.resolve(__dirname, '../public/admin')));
app.use('/docs', express.static(path.resolve(__dirname, '../docs')));

// Health check endpoint
app.get('/health', (request, response) => {
  const dbState = mongoose.connection.readyState;
  const states = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  response.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: states[dbState] || 'unknown',
    version: process.env.FORM_VERSION || '2026-v1'
  });
});

// API Documentation redirect & spec
app.get('/api/docs', (request, response) => {
  response.sendFile(path.resolve(__dirname, '../docs/openapi.json'));
});

// Primary API routers
app.use('/api/census', censusRouter);
app.use('/api/admin', adminRouter);

// Root redirect to Admin Portal
app.get('/', (request, response) => {
  response.redirect('/admin');
});

// 404 Route handler
app.use((request, response) => {
  if (request.accepts('html')) {
    return response.redirect('/admin');
  }
  return response.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use(errorHandler);

async function start() {
  if (process.env.MONGODB_URI) {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('MongoDB connected successfully');
    } catch (err) {
      console.warn('MongoDB connection error:', err.message);
    }
  } else {
    console.warn('Notice: MONGODB_URI is not defined in environment.');
  }

  app.listen(port, () => {
    console.log(`===================================================`);
    console.log(` ICB Student Census System — Backend & Admin Portal`);
    console.log(` Listening on: http://localhost:${port}`);
    console.log(` Admin Portal: http://localhost:${port}/admin`);
    console.log(` OpenAPI Spec: http://localhost:${port}/api/docs`);
    console.log(`===================================================`);
  });
}

if (require.main === module) {
  start().catch((error) => {
    console.error('Fatal startup error:', error);
    process.exit(1);
  });
}

module.exports = { app, start };
