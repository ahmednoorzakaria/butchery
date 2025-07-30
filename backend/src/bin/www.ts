#!/usr/bin/env node

import app from '../app';
import http from 'http';

const port = process.env.PORT || 3000;
const server = http.createServer(app);

server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
