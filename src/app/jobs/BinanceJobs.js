import binance, {
  getMaxLeverage,
  getBancaAtual,
  getSymbolFilters,
  adjustQty,
  adjustPrice,
} from '../../utils/binance';
import calcularTargetUSD from '../../utils/calcularTargetUSD';

import PositionJobs from './PositionJobs';

import { strategy } from '../../../.env';

const { profitPct, lossPct } = strategy;

class BinanceJobs {
  async leverage(pos) {
    const maxLev = await getMaxLeverage(pos.symbol);

    if (pos.leverage !== maxLev) {
      await binance.futuresLeverage({
        symbol: pos.symbol,
        leverage: maxLev,
      });
    }
  }

  async marginType(pos) {
    if (pos.marginType !== 'cross') {
      await binance.futuresMarginType({
        symbol: pos.symbol,
        marginType: 'CROSSED',
      });
    }
  }

  async initialTargetUsd() {
    const banca = await getBancaAtual();
    // const banca = 20;
    const target = calcularTargetUSD(banca);

    return target;
  }

  async calcularQtyIdeal({ stepSize, targetProfitUsd, price }) {
    const rawQty = targetProfitUsd / (price * (profitPct / 100)); // sem leverage aqui
    const adjustedQty = adjustQty(rawQty, stepSize);
    return Number(adjustedQty);
  }

  async initialMartin(candlesValidos) {
    const target = await this.initialTargetUsd(); // seu alvo em USDT
    const TOL = 0.1; // 10% Tolerancia da diferença entre o lucro esperado e a posição que pode ser aberta
    let ativoSelecionado = null;

    for (const candle of candlesValidos) {
      const pos = (
        await binance.futuresPositionRisk({ symbol: candle.symbol })
      )[0];
      let markPrice = 0;
      markPrice = Number(pos.markPrice);
      if (markPrice === 0) {
        const p = await binance.futuresMarkPrice({ symbol: candle.symbol });
        markPrice = p.markPrice;
      }

      const { tickSize, stepSize } = await getSymbolFilters(candle.symbol);

      // preço: ajuste com tickSize (não stepSize)
      const price = Number(adjustPrice(markPrice, tickSize));

      // qty “ideal” para atingir o target
      const qtyRaw = target / (price * (profitPct / 100));
      const qty = Number(adjustQty(qtyRaw, stepSize));

      // lucro esperado com a qty ajustada
      const expected = qty * price * (profitPct / 100);

      // diferença relativa vs target
      const relDiff = Math.abs(expected - target) / target;

      // passa só se a diferença for <= 10%
      if (relDiff <= TOL) {
        ativoSelecionado = {
          symbol: candle.symbol,
          qty,
          price,
          tickSize,
          pos,
          pnlUsd: expected,
        };
        break;
      }
    }

    return ativoSelecionado;
  }

  async continueMartin(candlesValidos, ultimaPosicao) {
    const target = ultimaPosicao.slUsd * 2;
    const TOL = 0.1; // 10% Tolerancia da diferença entre o lucro esperado e a posição que pode ser aberta
    let ativoSelecionado = null;

    for (const candle of candlesValidos) {
      const pos = (
        await binance.futuresPositionRisk({ symbol: candle.symbol })
      )[0];

      const { tickSize, stepSize } = await getSymbolFilters(candle.symbol);

      // preço: ajuste com tickSize (não stepSize)
      const price = Number(adjustPrice(pos.markPrice, tickSize));

      // qty “ideal” para atingir o target
      const qtyRaw = target / (price * (profitPct / 100));
      const qty = Number(adjustQty(qtyRaw, stepSize));

      // lucro esperado com a qty ajustada
      const expected = qty * price * (profitPct / 100);

      // diferença relativa vs target
      const relDiff = Math.abs(expected - target) / target;

      // passa só se a diferença for <= 10%
      if (relDiff <= TOL) {
        ativoSelecionado = {
          symbol: candle.symbol,
          qty,
          price,
          tickSize,
          pos,
          pnlUsd: expected,
        };
        break;
      }
    }

    return ativoSelecionado;
  }

  async compra(ativo) {
    await this.leverage(ativo.pos);
    await this.marginType(ativo.pos);

    const entryId = `ENTRY_${Date.now()}`;
    await binance.futuresOrder({
      symbol: ativo.symbol,
      side: 'BUY',
      type: 'MARKET',
      quantity: ativo.qty,
      newClientOrderId: entryId,
    });

    const tpId = `TP_${Date.now()}`;
    const slId = `SL_${Date.now()}`;
    const entryPx = ativo.price;
    const tpPx = adjustPrice(entryPx * (1 + profitPct / 100), ativo.tickSize); // +3%
    const slPx = adjustPrice(entryPx * (1 - lossPct / 100), ativo.tickSize); // -3%

    await binance.futuresOrder({
      symbol: ativo.symbol,
      side: 'SELL',
      type: 'TAKE_PROFIT_MARKET',
      stopPrice: String(tpPx),
      closePosition: true,
      newClientOrderId: tpId,
    });
    await binance.futuresOrder({
      symbol: ativo.symbol,
      side: 'SELL',
      type: 'STOP_MARKET',
      stopPrice: String(slPx),
      closePosition: true,
      newClientOrderId: slId,
    });

    await PositionJobs.criarPosicao({
      symbol: ativo.symbol,
      entryId,
      tpId,
      slId,
      qty: ativo.qty,
      price: ativo.price,
      tpPrice: tpPx,
      slPrice: slPx,
    });
  }

  async buscarEntry(position) {
    const ord = await binance.futuresGetOrder({
      symbol: position.symbol,
      origClientOrderId: position.entryId, // seu ID
    });

    return ord;
  }

  async detectCloseReason({ symbol, entryId, tpId, slId } = {}) {
    // 1) posição atual
    const allPos = await binance.futuresPositionRisk({ symbol });
    const pos = allPos[0];
    const amt = Number(pos?.positionAmt || 0);

    // 2) ordens recentes
    const orders = await binance.futuresAllOrders({ symbol, limit: 50 }); // mais se precisar
    const byTimeDesc = orders.sort((a, b) => b.updateTime - a.updateTime);

    // helper: ordem preenchida?
    const isFilled = (o) => o && o.status === 'FILLED';

    // 3) se zerou, descubra quem fechou
    if (amt === 0) {
      await binance.futuresCancelAllOpenOrders({ symbol });
      const tp = byTimeDesc.find((o) => o.clientOrderId === tpId);
      const sl = byTimeDesc.find((o) => o.clientOrderId === slId);

      if (isFilled(tp)) {
        const transacao = await this.buscarTransacao(tp);
        return { closed: true, reason: 'PROFIT', order: tp, transacao };
      }
      if (isFilled(sl)) {
        const transacao = await this.buscarTransacao(sl);
        return { closed: true, reason: 'LOSS', order: sl, transacao };
      }

      // última ordem que reduziu/zerou posição (não é infalível, mas funciona bem)
      const closer = byTimeDesc.find(
        (o) =>
          o.status === 'FILLED' &&
          (o.reduceOnly ||
            o.closePosition ||
            ['TAKE_PROFIT_MARKET', 'STOP_MARKET', 'MARKET', 'LIMIT'].includes(
              o.type
            ))
      );

      // se não é TP/SL nosso → consideramos MANUAL
      if (closer && ![tpId, slId, entryId].includes(closer.clientOrderId)) {
        const transacao = await this.buscarTransacao(closer);

        return { closed: true, reason: 'MANUAL', order: closer, transacao };
      }

      // fallback: fechou mas não achamos a ordem (pouco provável)
      return { closed: true, reason: 'UNKNOWN' };
    }

    // posição ainda aberta
    return { closed: false, reason: null };
  }

  async buscarTransacao(ord) {
    const trades = await binance.futuresUserTrades({
      symbol: ord.symbol,
      limit: 1000,
    });
    const toId = (x) =>
      x && typeof x.toString === 'function' ? x.toString() : String(x);

    const fills = trades.filter((t) => toId(t.orderId) === toId(ord.orderId)); // closer = TP/SL FILLED

    const pnl = fills.reduce((s, t) => s + Number(t.realizedPnl), 0);
    const fees = fills.reduce((s, t) => s + Number(t.commission), 0);
    const netRealized = pnl - fees;

    const transacao = {
      pnl,
      fees,
      netRealized,
    };

    return transacao;
  }
}

export default new BinanceJobs();
