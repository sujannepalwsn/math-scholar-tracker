import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
// import mongoose from 'mongoose'; // Removed mongoose
import { createClient } from '@supabase/supabase-js';
import userRoutes from './routes/userRoutes.js';
import lessonRoutes from './routes/lessonRoutes.js';
import homeworkRoutes from './routes/homeworkRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY; // Use service key for backend

if (!supabaseUrl || !supabaseKey) {
  console.error("FATAL ERROR: SUPABASE_URL or SUPABASE_SERVICE_KEY is not defined in .env file.");
  process.exit(1);
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Removed MongoDB connection logic

// API Routes
app.get('/api', (req, res) => {
  res.json({ message: 'Welcome to Tuition Tracker API - V1 (Supabase integrated)' });
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
