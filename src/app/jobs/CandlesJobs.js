import { fetchKlinesSimple } from '../../utils/candles';
import config from '../../../.env';

class CandleJobs {
  async candleAtual(symbol = null) {
    if (symbol) {
      const candles = await fetchKlinesSimple({ symbol });

      return [candles[candles.length - 1]];
    }
    const { symbols } = config.strategy;

    const candlesAtuais = [];
    for (const symb of symbols) {
      const candles = await fetchKlinesSimple({ symbol: symb });

      candlesAtuais.push(candles[candles.length - 1]);
    }

    return candlesAtuais;
  }

  async candleAnterior(symbol = null) {
    if (symbol) {
      const candles = await fetchKlinesSimple({ symbol });

      return [candles[candles.length - 2]];
    }
    const { symbols } = config.strategy;

    const candlesAteriores = [];
    for (const symb of symbols) {
      const candles = await fetchKlinesSimple({ symbol: symb });

      candlesAteriores.push(candles[candles.length - 2]);
    }

    return candlesAteriores;
  }

  async candleFiltro(candles = []) {
    const candlesValidos = [];
    for (const candle of candles) {
      if (candle.rsi <= config.strategy.rsibuy) {
        if (
          candle.close >= candle[config.strategy.ema1] &&
          candle.close >= candle[config.strategy.ema2]
        ) {
          candlesValidos.push(candle);
        }
      }
    }

    return candlesValidos;
  }
}

export default new CandleJobs();
