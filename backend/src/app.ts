import express from 'express';
import logger from 'morgan';
import bodyParser from 'body-parser';
import cors from 'cors';

import authRoutes from './routes/auth';
import profileRoutes from './routes/profile';
import inventoryRouter from './routes/inventory';
import salesRouter from './routes/sales';
import reportsRouter from './routes/reports';
import dailyReportsRouter from './routes/dailyReports';

const app = express();

const allowedOrigin = 'http://13.49.240.213';

const corsOptions = {
  origin: allowedOrigin,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

app.use(logger('dev'));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Preflight support

//routes
app.use('/auth', authRoutes);
app.use('/profile', profileRoutes);
app.use('/inventory', inventoryRouter);
app.use('/sales', salesRouter);
app.use('/sales/reports', reportsRouter);
app.use('/daily-reports', dailyReportsRouter);

export default app;
