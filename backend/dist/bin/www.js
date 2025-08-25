#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config(); // ✅ Loads variables from .env into process.env
const app_1 = __importDefault(require("../app"));
const http_1 = __importDefault(require("http"));
const port = parseInt(process.env.PORT || '3005', 10); // ✅ Ensures it's a number
const server = http_1.default.createServer(app_1.default);
server.listen(port, '127.0.0.1', () => {
    console.log(`Server running on http://127.0.0.1:${port}`);
});
