"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const morgan_1 = __importDefault(require("morgan"));
const body_parser_1 = __importDefault(require("body-parser"));
const cors_1 = __importDefault(require("cors"));
const auth_1 = __importDefault(require("./routes/auth"));
const profile_1 = __importDefault(require("./routes/profile"));
const inventory_1 = __importDefault(require("./routes/inventory"));
const sales_1 = __importDefault(require("./routes/sales"));
const reports_1 = __importDefault(require("./routes/reports"));
const dailyReports_1 = __importDefault(require("./routes/dailyReports"));
const expenses_1 = __importDefault(require("./routes/expenses"));
const app = (0, express_1.default)();
const allowedOrigin = process.env.ALLOWED_ORIGIN || 'http://localhost:8080';
const corsOptions = {
    origin: allowedOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
};
app.use((0, morgan_1.default)('dev'));
app.use(express_1.default.json());
app.use(body_parser_1.default.urlencoded({ extended: false }));
app.use((0, cors_1.default)(corsOptions));
app.options('*', (0, cors_1.default)(corsOptions)); // Preflight support
//routes
app.use('/auth', auth_1.default);
app.use('/profile', profile_1.default);
app.use('/inventory', inventory_1.default);
app.use('/sales', sales_1.default);
app.use('/sales/reports', reports_1.default);
app.use('/daily-reports', dailyReports_1.default);
app.use('/expenses', expenses_1.default);
exports.default = app;
