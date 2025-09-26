import Position from '../models/Position';

class PositionController {
  async store(req, res) {
    const { id } = await Position.create({
      symbol: 'BTCUSDT',
      entryId: 'E_123',
      tpId: 'TP_123',
      slId: 'SL_123',
      qty: '0.01',
      entryPrice: '65000',
      notionalUsd: '650',
      leverage: 100, // pode omitir para usar 1
      entryTime: new Date(),
    });

    return res.json({ id });
  }
}

export default new PositionController();
