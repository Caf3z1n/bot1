// candles_min.js — pega os ÚLTIMOS 100 candles de 15m e adiciona:
// • RSI(14), EMA20, EMA50 no próprio 15m (via "technicalindicators")
// • EMA20 diária e EMA50 diária (via "technicalindicators") mapeadas para cada 15m usando o DIA ATUAL (parcial): openTime <= t <= closeTime
// Datas no formato "dd/MM/yyyy HH:mm" (horário local do servidor).
//
// Instalação: npm i binance-api-node technicalindicators

const Binance = require('binance-api-node').default;
const { RSI, EMA } = require('technicalindicators');

const client = Binance({});

// --- utilitários ---
const toNum = (x) => Number(x);
const round = (x, d = 2) => (Number.isFinite(x) ? Number(x.toFixed(d)) : null);
const pad2 = (n) => (n < 10 ? '0' : '') + n;
function fmtDate(ms) {
  // desloca 3h para simular UTC-3 sem custo de timezone
  const d = new Date(ms - 3 * 60 * 60 * 1000);
  const dd = pad2(d.getUTCDate());
  const MM = pad2(d.getUTCMonth() + 1);
  const yyyy = d.getUTCFullYear();
  const HH = pad2(d.getUTCHours());
  const mm = pad2(d.getUTCMinutes());
  return `${dd}/${MM}/${yyyy} ${HH}:${mm}`;
}

// Alinha saída do EMA da lib (que começa em index = period-1) ao mesmo tamanho do input
function alignEMA(values, period) {
  const n = values.length;
  const raw = EMA.calculate({ period, values }); // length = n - period + 1
  const out = new Array(n).fill(null);
  for (let i = period - 1, j = 0; i < n; i++, j++) out[i] = round(raw[j], 2);
  return out;
}

// Alinha saída do RSI da lib (primeiro valor em index = period)
function alignRSI(values, period = 14) {
  const n = values.length;
  const raw = RSI.calculate({ period, values }); // length = n - period
  const out = new Array(n).fill(null);
  for (let i = period; i < n; i++) out[i] = round(raw[i - period], 2);
  return out;
}

// Busca o índice do diário do DIA ATUAL em que o 15m cai: openTime <= t <= closeTime (parcial permitido)
function findDailyIndexCurrent(days, t) {
  // busca binária pelo último openTime <= t
  let lo = 0;
  let hi = days.length - 1;
  let ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (days[mid].openTimeMs <= t) {
      ans = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  if (ans < 0) return -1;
  // se t está até o fechamento planejado do dia (inclui o exato fechamento)
  if (t <= days[ans].closeTimeMs) return ans;
  return ans; // segurança: em dados Binance, próximo dia tem openTime == closeTime do anterior
}

async function fetchKlinesSimple({ symbol = 'BTCUSDT' } = {}) {
  // 1) últimos 100 candles de 15m
  const raws15 = await client.futuresCandles({
    symbol,
    interval: '15m',
    limit: 1000,
  });
  if (!raws15 || !raws15.length) return [];

  const bars = raws15.map((c) => ({
    symbol,
    openTimeMs: +c.openTime,
    closeTimeMs: +c.closeTime,
    openTime: fmtDate(+c.openTime),
    closeTime: fmtDate(+c.closeTime),
    open: toNum(c.open),
    high: toNum(c.high),
    low: toNum(c.low),
    close: toNum(c.close),
    volume: toNum(c.volume),
  }));

  // 2) indicadores no próprio 15m (EMA20/EMA50/EMA200/RSI14) via technicalindicators
  const closes15 = bars.map((b) => b.close);
  const ema20_15 = alignEMA(closes15, 20);
  const ema50_15 = alignEMA(closes15, 50);
  const ema200_15 = alignEMA(closes15, 200);
  const rsi14_15 = alignRSI(closes15, 14);

  // 3) histórico diário suficiente p/ EMA50 diária (ordenado por openTime)
  const raws1d = await client.futuresCandles({
    symbol,
    interval: '1d',
    limit: 400,
  });
  const days = (raws1d || [])
    .map((c) => ({
      openTimeMs: +c.openTime,
      closeTimeMs: +c.closeTime,
      close: toNum(c.close),
    }))
    .sort((a, b) => a.openTimeMs - b.openTimeMs);

  const closes1d = days.map((d) => d.close);
  const ema20_1d_aligned = alignEMA(closes1d, 20);
  const ema50_1d_aligned = alignEMA(closes1d, 50);

  // 4) preencher cada 15m com EMAs diárias do DIA ATUAL (parciais)
  for (let i = 0; i < bars.length; i++) {
    // 15m
    bars[i].ema20 = ema20_15[i];
    bars[i].ema50 = ema50_15[i];
    bars[i].ema200 = ema200_15[i];
    bars[i].rsi = rsi14_15[i];

    // diário atual (parcial) em que o 15m cai
    const j = findDailyIndexCurrent(days, bars[i].closeTimeMs);
    if (j >= 0) {
      bars[i].ema20_1d = ema20_1d_aligned[j];
      bars[i].ema50_1d = ema50_1d_aligned[j];
    } else {
      bars[i].ema20_1d = null;
      bars[i].ema50_1d = null;
    }
  }

  return bars; // 100 itens (ou menos)
}

module.exports = { fetchKlinesSimple };

// Exemplo via CLI:
// node -e "(async()=>{const {fetchKlinesSimple}=require('./candles_min');const r=await fetchKlinesSimple({symbol:'BTCUSDT'});console.log(r.at(-1));})()"
