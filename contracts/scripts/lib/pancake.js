// PancakeSwap V2 helpers used by scripts/add-liquidity.js and its tests.
// Only the ABI fragments the script needs are included; everything here is
// plain JS with bigint math so it can be unit-tested without a network.

// Official PancakeSwap V2 router addresses (https://docs.pancakeswap.finance).
const PANCAKE_V2_ROUTERS = {
  56: "0x10ED43C718714eb63d5aA57B78B54704E256024E", // BNB Chain mainnet
  97: "0xD99D1c33F9fC3444f8101754aBC46c52416550D1", // BNB Chain testnet
};

const ROUTER_ABI = [
  "function factory() view returns (address)",
  "function WETH() view returns (address)",
  "function addLiquidityETH(address token, uint256 amountTokenDesired, uint256 amountTokenMin, uint256 amountETHMin, address to, uint256 deadline) payable returns (uint256 amountToken, uint256 amountETH, uint256 liquidity)",
];

const FACTORY_ABI = ["function getPair(address tokenA, address tokenB) view returns (address pair)"];

const PAIR_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
  "function token0() view returns (address)",
];

// Subset of ERC-20 the script needs on the LIXI side.
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 value) returns (bool)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
];

const BPS_DENOMINATOR = 10_000n;
const ONE = 10n ** 18n;

function toBigInt(value, name) {
  if (typeof value === "bigint") return value;
  if (typeof value === "number" && Number.isInteger(value)) return BigInt(value);
  if (typeof value === "string" && /^\d+$/.test(value)) return BigInt(value);
  throw new TypeError(`${name} must be a bigint (or integer), got ${typeof value}: ${value}`);
}

/**
 * Returns the PancakeSwap V2 router for a chain id, or null when unknown.
 */
function routerAddressFor(chainId) {
  return PANCAKE_V2_ROUTERS[Number(chainId)] || null;
}

/**
 * Minimum amounts for addLiquidityETH given a slippage tolerance in basis
 * points (100 bps = 1 %). Pure bigint math, rounded down.
 *
 * @param {bigint} tokenAmount token amount in wei (18 decimals)
 * @param {bigint} bnbAmount BNB amount in wei
 * @param {bigint|number} slippageBps 0 <= bps < 10000
 * @returns {{ amountTokenMin: bigint, amountETHMin: bigint }}
 */
function computeMinAmounts(tokenAmount, bnbAmount, slippageBps) {
  const token = toBigInt(tokenAmount, "tokenAmount");
  const bnb = toBigInt(bnbAmount, "bnbAmount");
  const bps = toBigInt(slippageBps, "slippageBps");
  if (token <= 0n) throw new RangeError("tokenAmount must be > 0");
  if (bnb <= 0n) throw new RangeError("bnbAmount must be > 0");
  if (bps < 0n || bps >= BPS_DENOMINATOR) {
    throw new RangeError(`slippageBps must be between 0 and ${BPS_DENOMINATOR - 1n} (got ${bps})`);
  }
  const keep = BPS_DENOMINATOR - bps;
  return {
    amountTokenMin: (token * keep) / BPS_DENOMINATOR,
    amountETHMin: (bnb * keep) / BPS_DENOMINATOR,
  };
}

/**
 * Formats an 18-decimal fixed-point bigint as a decimal string
 * (trailing zeros trimmed, "0" when the fraction is empty).
 */
function formatFixed18(value) {
  const v = toBigInt(value, "value");
  const neg = v < 0n;
  const abs = neg ? -v : v;
  const whole = abs / ONE;
  const frac = (abs % ONE).toString().padStart(18, "0").replace(/0+$/, "");
  return (neg ? "-" : "") + whole.toString() + (frac ? "." + frac : "");
}

/**
 * Implied launch price when `tokenAmount` LIXI (wei) is paired with
 * `bnbAmount` BNB (wei). Both directions are returned as 18-decimal
 * fixed-point bigints plus human-readable strings. Both assets have 18
 * decimals so the ratio of the raw wei amounts is the ratio of whole units.
 *
 * @returns {{ bnbPerTokenWei: bigint, tokenPerBnbWei: bigint, bnbPerToken: string, tokenPerBnb: string }}
 */
function impliedPrice(tokenAmount, bnbAmount) {
  const token = toBigInt(tokenAmount, "tokenAmount");
  const bnb = toBigInt(bnbAmount, "bnbAmount");
  if (token <= 0n) throw new RangeError("tokenAmount must be > 0");
  if (bnb <= 0n) throw new RangeError("bnbAmount must be > 0");
  const bnbPerTokenWei = (bnb * ONE) / token;
  const tokenPerBnbWei = (token * ONE) / bnb;
  return {
    bnbPerTokenWei,
    tokenPerBnbWei,
    bnbPerToken: formatFixed18(bnbPerTokenWei),
    tokenPerBnb: formatFixed18(tokenPerBnbWei),
  };
}

/**
 * Explorer / DEX links for a token + pair on BNB Chain. Returns an empty
 * object for chains without public explorers (hardhat, localhost).
 */
function explorerLinks(chainId, { token, pair, txHash } = {}) {
  const id = Number(chainId);
  const links = {};
  if (id === 56) {
    if (token) links.tokenBscScan = `https://bscscan.com/token/${token}`;
    if (pair) links.pairBscScan = `https://bscscan.com/address/${pair}`;
    if (txHash) links.txBscScan = `https://bscscan.com/tx/${txHash}`;
    if (token) links.pancakeSwap = `https://pancakeswap.finance/swap?outputCurrency=${token}&chain=bsc`;
    if (token) links.pancakeAddLiquidity = `https://pancakeswap.finance/add/BNB/${token}?chain=bsc`;
    if (pair) links.pancakePairInfo = `https://pancakeswap.finance/info/v2/pairs/${pair}`;
    if (pair) links.dexScreener = `https://dexscreener.com/bsc/${pair}`;
  } else if (id === 97) {
    if (token) links.tokenBscScan = `https://testnet.bscscan.com/token/${token}`;
    if (pair) links.pairBscScan = `https://testnet.bscscan.com/address/${pair}`;
    if (txHash) links.txBscScan = `https://testnet.bscscan.com/tx/${txHash}`;
    if (token) links.pancakeSwap = `https://pancakeswap.finance/swap?outputCurrency=${token}&chain=bscTestnet`;
    if (token) links.pancakeAddLiquidity = `https://pancakeswap.finance/add/BNB/${token}?chain=bscTestnet`;
    // DexScreener and the PancakeSwap info pages do not index the testnet.
  }
  return links;
}

module.exports = {
  PANCAKE_V2_ROUTERS,
  ROUTER_ABI,
  FACTORY_ABI,
  PAIR_ABI,
  ERC20_ABI,
  BPS_DENOMINATOR,
  routerAddressFor,
  computeMinAmounts,
  impliedPrice,
  formatFixed18,
  explorerLinks,
};
