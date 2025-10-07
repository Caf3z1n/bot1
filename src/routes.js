import { Router } from 'express';

import PositionController from './app/controllers/PositionController';
import BinanceController from './app/controllers/BinanceController';
import CandleController from './app/controllers/CanldeController';

const routes = Router();

routes.get('/positions', PositionController.index);

routes.post('/binance', BinanceController.store);

routes.get('/candles', CandleController.index);

export default routes;
