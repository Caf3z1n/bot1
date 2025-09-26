import PositionsJobs from './app/jobs/PositionJobs';
import CandlesJobs from './app/jobs/CandlesJobs';
import BinanceJobs from './app/jobs/BinanceJobs';

const INTERVAL_MS = 10_000; // 10 seg
let running = false;

async function tick() {
  if (running) return; // evita corrida entre ticks
  running = true;

  try {
    const ultimaPosicao = await PositionsJobs.ultimaPosicao();

    if (ultimaPosicao === null || ultimaPosicao.closed) {
      // Abrir posições

      const candles = await CandlesJobs.candleAnterior(
        ultimaPosicao && ultimaPosicao.result === 'LOSS'
          ? ultimaPosicao.symbol
          : null
      ); // Caso a ultima foi Loss, ele passa um unico symbol, se não ele não passa nada

      const candlesValidos = await CandlesJobs.candleFiltro(candles);

      if (candlesValidos.length >= 1) {
        if (ultimaPosicao && ultimaPosicao.result === 'LOSS') {
          const ativo = await BinanceJobs.continueMartin(
            candlesValidos,
            ultimaPosicao
          );

          await BinanceJobs.compra(ativo);
        } else {
          const ativo = await BinanceJobs.initialMartin(candlesValidos);

          await BinanceJobs.compra(ativo);
        }
      }
    } else {
      // Observando posição aberta
      // console.log('Observando uma posição já aberta');

      if (!ultimaPosicao.entryPrice) {
        await PositionsJobs.preencherPosicao(ultimaPosicao);
      }

      const result = await BinanceJobs.detectCloseReason(ultimaPosicao);
      if (result.closed === true) {
        await ultimaPosicao.update({
          closed: true,
          result: result.reason,
          exitTime: new Date(),
        });

        await PositionsJobs.finalizarPosicao(result, ultimaPosicao);
      }
    }
  } catch (e) {
    console.error('[LIVE] erro:', e?.message || e);
  } finally {
    running = false;
    setTimeout(tick, INTERVAL_MS);
  }
}

tick();
