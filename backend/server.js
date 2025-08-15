const express = require('express');
const cors = require('cors');

require('dotenv').config();

const app = express();
const sequelize = require('./config/database');
const authRoutes = require('./routes/auth');
const habitRoutes = require('./routes/habitRoutes');
const userRoutes = require('./routes/user'); 
const rewardRoutes = require('./routes/rewardRoutes');
const pointRoutes  = require('./routes/points');
const achievementRoutes = require('./routes/achievementRoutes');
// const seedRoutes = require('./routes/seed');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/auth', authRoutes);
app.use('/habits', habitRoutes);
app.use('/users', userRoutes); 
app.use('/rewards', rewardRoutes);
app.use('/points', pointRoutes);
app.use('/achievements', achievementRoutes);

// app.use('/seed', seedRoutes);

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
