import express from 'express';
import logger from 'morgan';
import bodyParser from 'body-parser';
import cors from 'cors';

import authRoutes from './routes/auth';
import profileRoutes from './routes/profile';
import inventoryRouter from './routes/inventory';
import salesRouter from './routes/sales';


const app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());

//routes
app.use('/auth', authRoutes);
app.use('/profile', profileRoutes);
app.use('/inventory', inventoryRouter);
app.use('/sales', salesRouter);

export default app;
