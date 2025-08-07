'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('RewardLists', [
      {
        name: 'Pizza Gratis',
        points: 100,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Main Game 1 Jam',
        points: 150,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Nonton Bioskop',
        points: 300,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('RewardLists', null, {});
  }
};
