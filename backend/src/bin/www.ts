#!/usr/bin/env node

import app from '../app';
import http from 'http';
const port = parseInt(process.env.PORT || '3005', 10);  // ✅ Ensures it's a number
const server = http.createServer(app);

server.listen(port, '0.0.0.0', () => {
  console.log(`Server running on http://192.168.0.111:${port}`);
});
