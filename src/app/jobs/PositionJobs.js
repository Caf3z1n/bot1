import Position from '../models/Position';

import BinanceJobs from './BinanceJobs';

class PositionJobs {
  async ultimaPosicao() {
    const position = await Position.findOne({
      order: [['id', 'DESC']],
    });

    return position || null;
  }

  async criarPosicao(posicao) {
    await Position.create({
      symbol: posicao.symbol,
      entryId: posicao.entryId,
      tpId: posicao.tpId,
      slId: posicao.slId,
      qty: posicao.qty,
      price: posicao.price,
      notionalUsd: posicao.qty * posicao.price,
      tpPrice: posicao.tpPrice,
      slPrice: posicao.slPrice,
      entryTime: new Date(),
    });
  }

  async preencherPosicao(position) {
    const ord = await BinanceJobs.buscarEntry(position);

    if (ord.status === 'FILLED') {
      const entryPrice = Number(ord.avgPrice);

      const tpUsd =
        position.qty *
        entryPrice *
        Math.abs((position.tpPrice - entryPrice) / entryPrice);

      const slUsd =
        position.qty *
        entryPrice *
        Math.abs((position.slPrice - entryPrice) / entryPrice);

      const transacao = await BinanceJobs.buscarTransacao(ord);

      await position.update({
        entryPrice,
        tpUsd,
        slUsd,
        fees: transacao.fees,
      });
    }
  }

  async finalizarPosicao(ord, ultimaPosicao) {
    await ultimaPosicao.update({
      fees: Number(ultimaPosicao.fees) + ord.transacao.fees,
      pnlRealised: ord.transacao.pnl,
    });
  }
}

export default new PositionJobs();
