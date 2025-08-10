#!/usr/bin/env node
import dotenv from 'dotenv';
dotenv.config();

import app from '../app.js';
import http from 'http';

// Use PORT from .env or default to 3000 for local
const port = parseInt( '3001', 10);

// Change 'localhost' if you only want local access
const host = process.env.HOST || 'localhost';

const server = http.createServer(app);

server.listen(port, host, () => {
  console.log(`Server running on http://${host}:${port}`);
});
