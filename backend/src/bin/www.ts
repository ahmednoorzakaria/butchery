#!/usr/bin/env node
import dotenv from 'dotenv';
dotenv.config(); // ✅ Loads variables from .env into process.env

import app from '../app';
import http from 'http';
const port = parseInt(process.env.PORT || '3005', 10);  // ✅ Ensures it's a number
const server = http.createServer(app);

server.listen(port, 'localhost', () => {
  console.log(`Server running on http://localhost:${port}`);
});
