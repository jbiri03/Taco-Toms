// run with node
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import menuRoutes from './routes/menu.js';
import uploadRoutes from './routes/upload.js';

dotenv.config();
const app = express();


app.use((req, res, next) => {
  console.log('INCOMING:', req.method, req.originalUrl);
  next();
});

// Core middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Routes
app.use('/menu', menuRoutes);
app.use('/upload', uploadRoutes);

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});