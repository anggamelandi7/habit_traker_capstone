const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const sequelize = require('../config/database'); 
const basename = path.basename(__filename);
const db = {};

// Autoload semua file model
fs
  .readdirSync(__dirname)
  .filter(file => {
    return (
      file.indexOf('.') !== 0 && // skip file tersembunyi
      file !== basename &&       // skip index.js itu sendiri
      file.slice(-3) === '.js'   // hanya ambil file .js
    );
  })
  .forEach(file => {
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    db[model.name] = model;
  });

// Jalankan fungsi associate jika model punya relasi
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

// Export semua model dan koneksi sequelize
db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
