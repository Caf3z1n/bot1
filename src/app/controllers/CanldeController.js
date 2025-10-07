import CandlesJobs from '../jobs/CandlesJobs';

class CandleController {
  async index(req, res) {
    const candles = await CandlesJobs.candleAtual();
    return res.json(candles);
  }
}

export default new CandleController();
