import BigNumber from 'bignumber.js';

export const priceFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD'
});

const fmtConfig = {
  prefix: '',
  decimalSeparator: '.',
  groupSeparator: ',',
  groupSize: 3,
  secondaryGroupSize: 0,
  fractionGroupSeparator: ',',
  fractionGroupSize: 0,
  suffix: ''
};

export const formatNumber = (
  number: bigint | number | string | BigNumber,
  decimals?: number,
  decimalsAutoPlacement: boolean = true
) => {
  const x = new BigNumber(number?.toString());
  if (x.isNaN()) {
    return number?.toString();
  }
  const dp = x.dp() ?? 0;
  let digit = decimals ? decimals : dp;
  if (!decimalsAutoPlacement) {
    digit = Math.min(dp, digit);
  }
  return x.toFormat(digit, BigNumber.ROUND_DOWN, fmtConfig);
};

export const formatNumberKMBT = (
  number: bigint | number | string | BigNumber,
  decimals?: number,
  decimalsAutoPlacement: boolean = true
) => {
  const bn = new BigNumber(number?.toString());
  if (bn.isNaN()) {
    return number?.toString();
  }
  const map = [
    { suffix: 'Sp', threshold: 1e24 },
    { suffix: 'Sx', threshold: 1e21 },
    { suffix: 'Qn', threshold: 1e18 },
    { suffix: 'Qd', threshold: 1e15 },
    { suffix: 'T', threshold: 1e12 },
    { suffix: 'B', threshold: 1e9 },
    { suffix: 'M', threshold: 1e6 },
    { suffix: 'K', threshold: 1e3 },
  ];
  const found = map.find((x) => bn.abs().gte(x.threshold));
  if (found) {
    const scaled = bn.shiftedBy(-Math.log10(found.threshold)).dp(2, BigNumber.ROUND_FLOOR);
    const formatted = formatNumber(scaled, 2, decimalsAutoPlacement);
    return `${formatted}${found.suffix}`;
  }
  return formatNumber(number, decimals, decimalsAutoPlacement);
}

export const formatNumberBracket = (number: BigNumber) => {
  const integer = number.toFixed(0);
  const decimals = number.toString().replace(integer, '').slice(1);
  let decimalZeroCount = 0;
  for (const char of decimals) {
    if (char === '0') decimalZeroCount++;
    else break;
  }
  if (decimalZeroCount <= 3) {
    return formatNumber(number.dp(4, BigNumber.ROUND_FLOOR));
  }
  return `${formatNumber(integer)}.0{${decimalZeroCount}}${decimals.slice(
    decimalZeroCount,
    decimalZeroCount + 3
  )}`;
};

export const formatNumberFor24H = (number: BigNumber) => {
  const intCount = number.integerValue(BigNumber.ROUND_FLOOR).toString().length;
  if (intCount <= 3) return formatNumber(number, 6, false);
  if (intCount <= 6) return formatNumber(number, 4, false);
  if (intCount <= 8) return formatNumber(number, 2, false);
  return formatNumber(number.dp(0));
};
