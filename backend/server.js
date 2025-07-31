// servernya
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const sequelize = require('./config/database');
const Habit = require('./models/Habit');
const habitRoutes = require('./routes/habitRoutes');

sequelize.sync().then(() => {
    console.log('Database synced!');
}).catch(err => {
    console.error('Failed to sync DB:', err);  
});


//Middleware
app.use(cors());
app.use(express.json());

//Routes
app.use('/habits', habitRoutes);

//Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

