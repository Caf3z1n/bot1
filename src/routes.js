import { Router } from 'express';

import PositionController from './app/controllers/PositionController'
import BinanceController from './app/controllers/BinanceController'

const routes = Router();

routes.post('/positions', PositionController.store);
routes.post('/binance', BinanceController.store);

export default routes;
