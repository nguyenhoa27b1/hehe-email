'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class File extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // A file is submitted for one task
      File.hasOne(models.Task, {
        foreignKey: 'submissionFileId',
        as: 'task'
      });
      // A file is uploaded by one user
      File.belongsTo(models.User, {
        foreignKey: 'uploaderId',
        as: 'uploader'
      });
    }
  }
  File.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    originalName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    savedPath: {
      type: DataTypes.STRING,
      allowNull: false
    },
    uploaderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    }
  }, {
    sequelize,
    modelName: 'File',
  });
  return File;
};