import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import userRoutes from './routes/userRoutes.js';
import lessonRoutes from './routes/lessonRoutes.js';
import homeworkRoutes from './routes/homeworkRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("FATAL ERROR: MONGO_URI is not defined in .env file.");
  process.exit(1); // Exit the application if DB connection string is not found
}

mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB Connected Successfully'))
  .catch(err => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1); // Exit on connection error
  });

// API Routes
app.get('/api', (req, res) => {
  res.json({ message: 'Welcome to Tuition Tracker API - V1' });
});

app.use('/api/users', userRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/api/homework', homeworkRoutes);


// Global error handler (optional basic one)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});


app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
