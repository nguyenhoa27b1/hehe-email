'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      // A user can be assigned many tasks
      User.hasMany(models.Task, {
        foreignKey: 'assigneeId',
        as: 'assignedTasks',
      });
      // A user can create many tasks
      User.hasMany(models.Task, {
        foreignKey: 'creatorId',
        as: 'createdTasks',
      });
      // A user can upload many files
      User.hasMany(models.File, {
        foreignKey: 'uploaderId',
        as: 'uploads',
      });
    }
  }
  User.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    googleId: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: true, // Nullable for Google Sign-In users
    },
    role: {
        type: DataTypes.ENUM('Admin', 'User', 'Viewer'),
        allowNull: false,
        defaultValue: 'User',
    },
    avatarUrl: {
        type: DataTypes.STRING,
        allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'User',
    timestamps: true, // Adds createdAt and updatedAt fields
  });
  return User;
};