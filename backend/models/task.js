'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Task extends Model {
    static associate(models) {
      // A task can have one submission file
      Task.belongsTo(models.File, {
        foreignKey: 'submissionFileId',
        as: 'submissionFile',
        onDelete: 'SET NULL',
      });
      // A task is assigned to one user
      Task.belongsTo(models.User, {
        foreignKey: 'assigneeId',
        as: 'assignee',
      });
      // A task is created by one user
      Task.belongsTo(models.User, {
        foreignKey: 'creatorId',
        as: 'creator',
      });
    }
  }
  Task.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    assigneeId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Users',
            key: 'id',
        }
    },
    creatorId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Users',
            key: 'id',
        }
    },
    deadline: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    status: {
        type: DataTypes.ENUM('To Do', 'In Progress', 'Done'),
        allowNull: false,
        defaultValue: 'To Do',
    },
    priority: {
        type: DataTypes.ENUM('High', 'Medium', 'Low'),
        defaultValue: 'Medium',
    },
    score: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
            min: 0,
            max: 100,
        },
    },
    submittedAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    submissionFileId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'Files',
            key: 'id'
        }
    },
  }, {
    sequelize,
    modelName: 'Task',
    timestamps: true,
  });
  return Task;
};