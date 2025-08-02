const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const sequelize = require('./config/database');
const authRoutes = require('./routes/auth');
const habitRoutes = require('./routes/habitRoutes');
const userRoutes = require('./routes/user'); // kalau kamu punya user detail lain

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/auth', authRoutes);
app.use('/habits', habitRoutes);
app.use('/users', userRoutes); // opsional

// Sync DB & Start Server
const PORT = process.env.PORT || 5000;
sequelize.sync().then(() => {
  console.log('Database connected & synced');
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch((err) => {
  console.error('Failed to sync database:', err);
});
