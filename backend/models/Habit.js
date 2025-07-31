const {DataTypes} = require('sequelize');
const sequelize = require('../config/database');

const Habit = sequelize.define('Habit', {
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    frequency: {
        type: DataTypes.STRING,
        defaultValue: 'daily'
    },
    is_completed: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
})

module.exports = Habit;