import binance from '../../utils/binance';

class BinanceController {
  async store(req, res) {
    const orders = await binance.futuresAllOrders({
      symbol: 'ETHUSDT',
      limit: 50,
    }); // mais se precisar
    const byTimeDesc = orders.sort((a, b) => b.updateTime - a.updateTime);

    const closer = byTimeDesc.find(
      (o) =>
        o.status === 'FILLED' &&
        (o.reduceOnly ||
          o.closePosition ||
          ['TAKE_PROFIT_MARKET', 'STOP_MARKET', 'MARKET', 'LIMIT'].includes(
            o.type
          ))
    );

    const trades = await binance.futuresUserTrades({
      symbol: closer.symbol,
      limit: 1000,
    });
    const toId = (x) =>
      x && typeof x.toString === 'function' ? x.toString() : String(x);

    const fills = trades.filter(
      (t) => toId(t.orderId) === toId(closer.orderId)
    );

    return res.json({ closer, fills, trades });
  }
}

export default new BinanceController();
