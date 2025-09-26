// import binance from '../../utils/binance';

class BinanceController {
  async store(req, res) {
    return res.json({ ok: true });
  }
}

export default new BinanceController();
