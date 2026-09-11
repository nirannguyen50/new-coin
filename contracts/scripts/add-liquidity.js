// Bootstraps the NEWC/BNB pool on PancakeSwap V2 (approve + addLiquidityETH).
// Usage:
//   npm run liquidity:testnet   (chainId 97)
//   npm run liquidity:mainnet   (chainId 56, requires CONFIRM_MAINNET=yes)
// Env (see .env.example): LIQUIDITY_TOKEN_AMOUNT (whole NEWC), LIQUIDITY_BNB_AMOUNT
// (whole BNB), LP_RECIPIENT (default: signer), SLIPPAGE_BPS (default 100),
// DEADLINE_MINUTES (default 20), ROUTER_ADDRESS (override), TOKEN_ADDRESS
// (override; default read from deployments/<network>.json), CONFIRM_MAINNET.
//
// The core logic lives in addLiquidity() so test/AddLiquidity.test.js can run
// it against the mock router in contracts/test/ on the in-process network.
// The real PancakeSwap router cannot be reached from the test suite; run the
// script on bscTestnet before mainnet.
const hre = require("hardhat");
const { loadDeployment, saveDeployment } = require("./lib/deployments");
const {
  ROUTER_ABI,
  FACTORY_ABI,
  PAIR_ABI,
  ERC20_ABI,
  routerAddressFor,
  computeMinAmounts,
  impliedPrice,
  explorerLinks,
} = require("./lib/pancake");

const DEFAULT_SLIPPAGE_BPS = 100;
const DEFAULT_DEADLINE_MINUTES = 20;

/**
 * Parses and validates the script configuration from an env-like object.
 * Pure (no network) so it can be unit-tested. Amounts are returned in wei.
 */
function readConfig(env, { ethers, deployment, chainId }) {
  const tokenAddress = env.TOKEN_ADDRESS || deployment?.token?.address;
  if (!tokenAddress || !ethers.isAddress(tokenAddress)) {
    throw new Error("No NewCoin deployment found for this network. Run the token deploy first or set TOKEN_ADDRESS.");
  }

  if (!env.LIQUIDITY_TOKEN_AMOUNT) throw new Error("LIQUIDITY_TOKEN_AMOUNT is missing (whole NEWC, e.g. 80000000)");
  if (!env.LIQUIDITY_BNB_AMOUNT) throw new Error("LIQUIDITY_BNB_AMOUNT is missing (whole BNB, e.g. 100)");
  const tokenAmount = ethers.parseUnits(String(env.LIQUIDITY_TOKEN_AMOUNT).trim(), 18);
  const bnbAmount = ethers.parseEther(String(env.LIQUIDITY_BNB_AMOUNT).trim());
  if (tokenAmount <= 0n) throw new Error("LIQUIDITY_TOKEN_AMOUNT must be > 0");
  if (bnbAmount <= 0n) throw new Error("LIQUIDITY_BNB_AMOUNT must be > 0");

  const routerAddress = env.ROUTER_ADDRESS || routerAddressFor(chainId);
  if (!routerAddress || !ethers.isAddress(routerAddress)) {
    throw new Error(`No PancakeSwap V2 router known for chainId ${chainId}. Set ROUTER_ADDRESS.`);
  }

  if (env.LP_RECIPIENT && !ethers.isAddress(env.LP_RECIPIENT)) {
    throw new Error("LP_RECIPIENT is not a valid address");
  }
  if (env.LP_RECIPIENT && env.LP_RECIPIENT === ethers.ZeroAddress) {
    throw new Error("LP_RECIPIENT cannot be the zero address");
  }

  const slippageBps = env.SLIPPAGE_BPS === undefined || env.SLIPPAGE_BPS === "" ? DEFAULT_SLIPPAGE_BPS : Number(env.SLIPPAGE_BPS);
  if (!Number.isInteger(slippageBps) || slippageBps < 0 || slippageBps >= 10_000) {
    throw new Error("SLIPPAGE_BPS must be an integer between 0 and 9999 (100 = 1%)");
  }
  const deadlineMinutes =
    env.DEADLINE_MINUTES === undefined || env.DEADLINE_MINUTES === "" ? DEFAULT_DEADLINE_MINUTES : Number(env.DEADLINE_MINUTES);
  if (!Number.isInteger(deadlineMinutes) || deadlineMinutes <= 0) {
    throw new Error("DEADLINE_MINUTES must be a positive integer");
  }

  return {
    tokenAddress,
    routerAddress,
    tokenAmount,
    bnbAmount,
    lpRecipient: env.LP_RECIPIENT || null,
    slippageBps,
    deadlineMinutes,
    confirmMainnet: env.CONFIRM_MAINNET === "yes",
  };
}

function fmt(ethers, wei) {
  const s = ethers.formatUnits(wei, 18);
  const [whole, frac = ""] = s.split(".");
  const trimmed = frac.replace(/0+$/, "");
  return whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (trimmed ? "." + trimmed : "");
}

/**
 * Core flow: approve router (if needed) -> addLiquidityETH -> read pair and
 * LP balance. Returns a plain object describing what happened. Does not
 * touch process.env or the deployments file.
 *
 * @param {object} p
 * @param {import("hardhat")} p.hre
 * @param {import("ethers").Signer} p.signer   pays gas, must hold the tokens and BNB
 * @param {string} p.tokenAddress
 * @param {string} p.routerAddress             PancakeSwap V2 router (or mock)
 * @param {bigint} p.tokenAmount               NEWC amount in wei
 * @param {bigint} p.bnbAmount                 BNB amount in wei
 * @param {string} [p.lpRecipient]             receives the LP tokens (default: signer)
 * @param {number} [p.slippageBps]             default 100 (1%)
 * @param {number} [p.deadlineMinutes]         default 20
 * @param {number} [p.confirmations]           tx confirmations to wait for (default 1)
 * @param {(line: string) => void} [p.log]     default console.log
 */
async function addLiquidity({
  hre,
  signer,
  tokenAddress,
  routerAddress,
  tokenAmount,
  bnbAmount,
  lpRecipient,
  slippageBps = DEFAULT_SLIPPAGE_BPS,
  deadlineMinutes = DEFAULT_DEADLINE_MINUTES,
  confirmations = 1,
  log = console.log,
}) {
  const { ethers } = hre;
  if (!signer) throw new Error("No signer configured - set PRIVATE_KEY in .env");
  if (!ethers.isAddress(tokenAddress)) throw new Error(`Invalid token address: ${tokenAddress}`);
  if (!ethers.isAddress(routerAddress)) throw new Error(`Invalid router address: ${routerAddress}`);
  tokenAmount = BigInt(tokenAmount);
  bnbAmount = BigInt(bnbAmount);
  const recipient = lpRecipient || signer.address;
  if (!ethers.isAddress(recipient) || recipient === ethers.ZeroAddress) {
    throw new Error(`Invalid LP recipient: ${recipient}`);
  }

  const provider = signer.provider;
  const chainId = (await provider.getNetwork()).chainId;

  const token = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
  const router = new ethers.Contract(routerAddress, ROUTER_ABI, signer);

  // --- Sanity checks --------------------------------------------------------
  if ((await provider.getCode(routerAddress)) === "0x") {
    throw new Error(`No contract code at router ${routerAddress} on chainId ${chainId}`);
  }
  if ((await provider.getCode(tokenAddress)) === "0x") {
    throw new Error(`No contract code at token ${tokenAddress} on chainId ${chainId}`);
  }
  const symbol = await token.symbol().catch(() => "TOKEN");
  const tokenBalance = await token.balanceOf(signer.address);
  const bnbBalance = await provider.getBalance(signer.address);
  if (tokenBalance < tokenAmount) {
    throw new Error(
      `Signer holds ${fmt(ethers, tokenBalance)} ${symbol} but ${fmt(ethers, tokenAmount)} ${symbol} is needed. ` +
        "Transfer the liquidity allocation from the treasury to the signer first."
    );
  }
  if (bnbBalance <= bnbAmount) {
    throw new Error(
      `Signer holds ${fmt(ethers, bnbBalance)} BNB but ${fmt(ethers, bnbAmount)} BNB plus gas is needed.`
    );
  }

  const factoryAddress = await router.factory();
  const wethAddress = await router.WETH();
  const factory = new ethers.Contract(factoryAddress, FACTORY_ABI, provider);

  const { amountTokenMin, amountETHMin } = computeMinAmounts(tokenAmount, bnbAmount, slippageBps);
  const price = impliedPrice(tokenAmount, bnbAmount);

  log(`Chain          : ${hre.network.name} (chainId ${chainId})`);
  log(`Signer         : ${signer.address}`);
  log(`Token          : ${tokenAddress} (${symbol})`);
  log(`Router         : ${routerAddress}`);
  log(`Factory        : ${factoryAddress}`);
  log(`WBNB           : ${wethAddress}`);
  log(`LP recipient   : ${recipient}`);
  log(`Token amount   : ${fmt(ethers, tokenAmount)} ${symbol}`);
  log(`BNB amount     : ${fmt(ethers, bnbAmount)} BNB`);
  log(`Slippage       : ${slippageBps} bps -> min ${fmt(ethers, amountTokenMin)} ${symbol} / ${fmt(ethers, amountETHMin)} BNB`);
  log(`Deadline       : ${deadlineMinutes} min`);
  log(`Implied price  : 1 ${symbol} = ${price.bnbPerToken} BNB ; 1 BNB = ${price.tokenPerBnb} ${symbol}`);

  // Warn when the pool already has reserves: the router then uses the pool
  // ratio, not ours, and the slippage bounds may reject the transaction.
  const existingPair = await factory.getPair(tokenAddress, wethAddress);
  if (existingPair !== ethers.ZeroAddress) {
    const pair = new ethers.Contract(existingPair, PAIR_ABI, provider);
    const [r0, r1] = await pair.getReserves();
    if (r0 > 0n || r1 > 0n) {
      log(
        `\n[WARNING] Pair ${existingPair} already has reserves (${r0} / ${r1}). ` +
          "The pool price is already set; the router will use the pool ratio, not the amounts above.\n"
      );
    }
  }

  // --- Approve (exact amount, skipped when allowance already suffices) ------
  let approveTxHash = null;
  const allowance = await token.allowance(signer.address, routerAddress);
  if (allowance >= tokenAmount) {
    log(`Allowance      : ${fmt(ethers, allowance)} ${symbol} already approved, skipping approve`);
  } else {
    log(`Approving      : ${fmt(ethers, tokenAmount)} ${symbol} for router...`);
    const tx = await token.approve(routerAddress, tokenAmount);
    const receipt = await tx.wait(confirmations);
    approveTxHash = receipt.hash;
    log(`Approve tx     : ${approveTxHash}`);
  }

  // --- addLiquidityETH ------------------------------------------------------
  const latest = await provider.getBlock("latest");
  const deadline = BigInt(latest.timestamp) + BigInt(deadlineMinutes) * 60n;

  const lpBefore =
    existingPair === ethers.ZeroAddress
      ? 0n
      : await new ethers.Contract(existingPair, PAIR_ABI, provider).balanceOf(recipient);

  log("Sending addLiquidityETH...");
  const tx = await router.addLiquidityETH(
    tokenAddress,
    tokenAmount,
    amountTokenMin,
    amountETHMin,
    recipient,
    deadline,
    { value: bnbAmount }
  );
  const receipt = await tx.wait(confirmations);
  log(`Liquidity tx   : ${receipt.hash} (block ${receipt.blockNumber})`);

  // --- Read back the pair ---------------------------------------------------
  const pairAddress = await factory.getPair(tokenAddress, wethAddress);
  if (pairAddress === ethers.ZeroAddress) {
    throw new Error("Factory returned no pair after addLiquidityETH - check the router/factory addresses");
  }
  const pair = new ethers.Contract(pairAddress, PAIR_ABI, provider);
  const lpBalance = await pair.balanceOf(recipient);
  const lpMinted = lpBalance - lpBefore;
  const token0 = await pair.token0();
  const [reserve0, reserve1] = await pair.getReserves();
  const tokenIsToken0 = token0.toLowerCase() === tokenAddress.toLowerCase();
  const reserveToken = tokenIsToken0 ? reserve0 : reserve1;
  const reserveBnb = tokenIsToken0 ? reserve1 : reserve0;

  const links = explorerLinks(chainId, { token: tokenAddress, pair: pairAddress, txHash: receipt.hash });

  log("");
  log(`Pair (LP token): ${pairAddress}`);
  log(`Pool reserves  : ${fmt(ethers, reserveToken)} ${symbol} / ${fmt(ethers, reserveBnb)} BNB`);
  log(`LP minted      : ${fmt(ethers, lpMinted)} Cake-LP -> ${recipient}`);
  log(`LP balance     : ${fmt(ethers, lpBalance)} Cake-LP (recipient total)`);
  log(`Launch price   : 1 ${symbol} = ${price.bnbPerToken} BNB ; 1 BNB = ${price.tokenPerBnb} ${symbol}`);
  if (Object.keys(links).length) {
    log("");
    log("Links:");
    for (const [name, url] of Object.entries(links)) log(`  ${name.padEnd(20)} ${url}`);
  }

  return {
    chainId: Number(chainId),
    tokenAddress,
    symbol,
    routerAddress,
    factoryAddress,
    wethAddress,
    pairAddress,
    lpRecipient: recipient,
    tokenAmount,
    bnbAmount,
    amountTokenMin,
    amountETHMin,
    slippageBps,
    deadline,
    price,
    approveTxHash,
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    lpMinted,
    lpBalance,
    reserves: { token: reserveToken, bnb: reserveBnb },
    links,
  };
}

/**
 * Builds the `liquidity` block stored in deployments/<network>.json.
 * Bigints are stringified so the record is plain JSON.
 */
function buildLiquidityRecord(result) {
  return {
    dex: "PancakeSwap V2",
    router: result.routerAddress,
    factory: result.factoryAddress,
    weth: result.wethAddress,
    pair: result.pairAddress,
    lpToken: result.pairAddress,
    lpRecipient: result.lpRecipient,
    tokenAmount: result.tokenAmount.toString(),
    bnbAmount: result.bnbAmount.toString(),
    amountTokenMin: result.amountTokenMin.toString(),
    amountETHMin: result.amountETHMin.toString(),
    slippageBps: result.slippageBps,
    lpMinted: result.lpMinted.toString(),
    lpBalance: result.lpBalance.toString(),
    priceBnbPerToken: result.price.bnbPerToken,
    priceTokenPerBnb: result.price.tokenPerBnb,
    approveTxHash: result.approveTxHash,
    txHash: result.txHash,
    blockNumber: result.blockNumber,
    links: result.links,
    addedAt: new Date().toISOString(),
  };
}

function printMainnetWarning(cfg, ethers) {
  const bar = "!".repeat(78);
  console.warn(`\n${bar}`);
  console.warn("!!  BNB CHAIN MAINNET - THIS SPENDS REAL BNB AND REAL NEWC AND CANNOT BE UNDONE  !!");
  console.warn(bar);
  console.warn(`   Token         : ${cfg.tokenAddress}`);
  console.warn(`   Router        : ${cfg.routerAddress}`);
  console.warn(`   NEWC in       : ${fmt(ethers, cfg.tokenAmount)}`);
  console.warn(`   BNB in        : ${fmt(ethers, cfg.bnbAmount)}`);
  console.warn(`   LP recipient  : ${cfg.lpRecipient || "(signer)"}`);
  console.warn("   The first addLiquidityETH sets the launch price for everyone. Double-check both amounts,");
  console.warn("   verify the router address on docs.pancakeswap.finance and make sure LP tokens will be locked.");
  console.warn(`${bar}\n`);
}

async function main() {
  const { ethers, network } = hre;
  const [signer] = await ethers.getSigners();
  if (!signer) throw new Error("No signer configured - set PRIVATE_KEY in .env");

  const chainId = (await ethers.provider.getNetwork()).chainId;
  const deployment = loadDeployment(network.name);
  const cfg = readConfig(process.env, { ethers, deployment, chainId });

  if (chainId === 56n) {
    printMainnetWarning(cfg, ethers);
    if (!cfg.confirmMainnet) {
      throw new Error("Refusing to add liquidity on BNB mainnet without CONFIRM_MAINNET=yes in the environment.");
    }
  }

  const confirmations = network.name === "hardhat" || network.name === "localhost" ? 1 : 2;
  const result = await addLiquidity({
    hre,
    signer,
    tokenAddress: cfg.tokenAddress,
    routerAddress: cfg.routerAddress,
    tokenAmount: cfg.tokenAmount,
    bnbAmount: cfg.bnbAmount,
    lpRecipient: cfg.lpRecipient,
    slippageBps: cfg.slippageBps,
    deadlineMinutes: cfg.deadlineMinutes,
    confirmations,
  });

  if (deployment && deployment.token?.address?.toLowerCase() === cfg.tokenAddress.toLowerCase()) {
    deployment.liquidity = buildLiquidityRecord(result);
    const file = saveDeployment(network.name, deployment);
    console.log("\nSaved liquidity record to", file);
  } else {
    console.log("\nNo matching deployments/<network>.json record; liquidity details were not persisted.");
  }

  console.log("\nNext steps:");
  console.log("  1. Lock 100% of the LP tokens (LP token = pair address above) for >= 12 months with a");
  console.log("     well-known locker (Team Finance, UNCX, PinkLock) and publish the lock link.");
  console.log("  2. Submit the token/pair to DexScreener, CoinGecko and CoinMarketCap.");
  return result;
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}

module.exports = { addLiquidity, readConfig, buildLiquidityRecord, main };
