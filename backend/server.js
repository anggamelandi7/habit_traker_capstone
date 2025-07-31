require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

// Routes
const habitRoutes = require('./routes/habitRoutes');
const userRoutes = require('./routes/user');

// DB Sequelize init
const sequelize = require('./config/database');
sequelize.sync()
  .then(() => console.log('Database synced!'))
  .catch(err => console.error('Failed to sync DB:', err));

// Middleware
app.use(cors());
app.use(express.json());

// Use routes
app.use('/habits', habitRoutes);
app.use('/users', userRoutes);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
