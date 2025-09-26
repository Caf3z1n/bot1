import Sequelize from 'sequelize';

import databaseConfig from '../config/database';
import Position from '../app/models/Position'

const models = [Position];

class Database {
  constructor() {
    this.init();
  }

  init() {
    this.connection = new Sequelize(
      databaseConfig.production.database,
      databaseConfig.production.username,
      databaseConfig.production.password,
      {
        host: databaseConfig.production.host,
        dialect: databaseConfig.production.dialect,
        port: databaseConfig.production.port,
      }
    );

    models
      .map((model) => model.init(this.connection))
      .map(
        (model) => model.associate && model.associate(this.connection.models)
      );
  }
}

export default new Database();
