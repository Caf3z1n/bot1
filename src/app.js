import express from 'express';
import cors from 'cors';

import './database';
import routes from './routes';
// import live from './live'; //

class App {
  constructor() {
    this.server = express();
    this.routes();
  }

  middlewares() {
    this.server.use(cors());
    this.server.use(express.json());
  }

  routes() {
    this.server.use(routes);
  }
}

export default new App().server;
