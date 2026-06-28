const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

// Initialize Daily Food Requirement Cron Scheduler
const { initScheduler } = require('./config/scheduler');
initScheduler();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

/* ================= ROUTES ================= */

// Root route (FIX for "Cannot GET /")
app.get('/', (req, res) => {
  res.send('Anna Setu Backend is running 🚀');
});

// Health check route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Anna Setu API is running 🚀'
  });
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/food', require('./routes/food'));
app.use('/api/requests', require('./routes/requests'));
app.use('/api/deliveries', require('./routes/deliveries'));

/* ================= SERVER ================= */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});