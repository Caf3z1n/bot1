import config from '../../.env';

const Binance = require('binance-api-node').default;

const binance = Binance({
  apiKey: config.binance.apiKey,
  apiSecret: config.binance.apiSecret,
});

export async function getLeverageBrackets(symbol) {
  // USDT-M Futures
  const res = await binance.futuresLeverageBracket({ symbol });
  // Nota: algumas libs retornam array ou objeto; normalize:
  const item = Array.isArray(res) ? res.find((x) => x.symbol === symbol) : res;
  if (!item) throw new Error(`Brackets não encontrados: ${symbol}`);
  // item.brackets: [{ bracket, initialLeverage, notionalCap, notionalFloor, maintMarginRatio, ... }, ...]
  return item.brackets;
}

export async function getMaxLeverage(symbol) {
  const brackets = await getLeverageBrackets(symbol);
  return Math.max(...brackets.map((b) => Number(b.initialLeverage)));
}

export async function getSymbolFilters(symbol) {
  const info = await binance.futuresExchangeInfo();
  const s = info.symbols.find((x) => x.symbol === symbol);
  if (!s) throw new Error(`Símbolo não encontrado: ${symbol}`);

  const priceFilter = s.filters.find((f) => f.filterType === 'PRICE_FILTER'); // tickSize
  const lotSize = s.filters.find((f) => f.filterType === 'LOT_SIZE'); // stepSize
  const marketLot = s.filters.find((f) => f.filterType === 'MARKET_LOT_SIZE'); // para MARKET qty
  const minNotional = s.filters.find((f) => f.filterType === 'MIN_NOTIONAL'); // alguns pares têm

  return {
    tickSize: priceFilter?.tickSize ?? '0.01',
    stepSize: lotSize?.stepSize ?? '0.001',
    minQty: lotSize?.minQty ?? '0',
    maxQty: lotSize?.maxQty ?? '999999',
    marketStep: marketLot?.stepSize ?? lotSize?.stepSize ?? '0.001',
    minNotional: minNotional?.notional ?? null,
  };
}

function toStr(x) {
  if (x == null) return '0';
  if (typeof x === 'string') return x;
  if (typeof x === 'number') return String(x);
  if (typeof x.toString === 'function') return x.toString();
  return '0';
}

function decimalsFromStep(step) {
  const s = toStr(step);
  // trata notação científica: 1e-5 -> 0.00001
  if (/e-/i.test(s)) {
    const [, base, expStr] = s.match(/^(\d+(?:\.\d+)?)[eE]-?(\d+)$/) || [];
    if (base && expStr) {
      const [i, f = ''] = base.split('.');
      const exp = Number(expStr);
      const zeros = '0'.repeat(Math.max(0, exp - f.length));
      const full = `0.${zeros}${i + f}`;
      return full.length - 2; // decimais
    }
  }
  const dot = s.indexOf('.');
  return dot === -1 ? 0 : s.length - dot - 1;
}

export function adjustToStep(value, step) {
  const v = Number(value);
  const st = Number(step);
  const dec = decimalsFromStep(st);
  // use floor para não “pular” o filtro pra cima
  return (Math.floor(v / st) * st).toFixed(dec);
}

export async function getBancaAtual() {
  const balances = await binance.futuresAccountBalance();
  const usdt = balances.find((b) => b.asset === 'USDT');

  return Number(Number(usdt.availableBalance).toFixed(2));
}

export const adjustPrice = adjustToStep; // preço usa tickSize
export const adjustQty = adjustToStep; // quantidade usa stepSize

export default binance;
