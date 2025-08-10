#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_js_1 = __importDefault(require("../app.js"));
const http_1 = __importDefault(require("http"));
// Use PORT from .env or default to 3000 for local
const port = parseInt('3001', 10);
// Change 'localhost' if you only want local access
const host = process.env.HOST || 'localhost';
const server = http_1.default.createServer(app_js_1.default);
server.listen(port, host, () => {
    console.log(`Server running on http://${host}:${port}`);
});
