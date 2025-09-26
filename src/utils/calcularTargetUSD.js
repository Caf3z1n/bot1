import config from '../../.env';

const { profitPct, lossPct, maxLosses } = config.strategy;

export default function calcularTargetUSD(banca) {
  const safety = 0.9;

  const p = lossPct / 100;
  const q = profitPct / 100;
  const r = 1 + p / q;
  const fator = r ** maxLosses - 1;
  return (banca * safety) / fator;
}
