const { expect } = require("chai");
const hre = require("hardhat");
const { ethers } = hre;
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const {
  PANCAKE_V2_ROUTERS,
  routerAddressFor,
  computeMinAmounts,
  impliedPrice,
  formatFixed18,
  explorerLinks,
} = require("../scripts/lib/pancake");
const { addLiquidity, readConfig, buildLiquidityRecord } = require("../scripts/add-liquidity");

const TOTAL_SUPPLY = 1_000_000_000n * 10n ** 18n;
const LIQ_TOKENS = ethers.parseUnits("80000000", 18); // 8% of supply, the "liquidity" bucket
const LIQ_BNB = ethers.parseEther("100");

describe("PancakeSwap helpers (scripts/lib/pancake.js)", function () {
  it("knows the official V2 routers for BNB mainnet and testnet", function () {
    expect(routerAddressFor(56)).to.equal("0x10ED43C718714eb63d5aA57B78B54704E256024E");
    expect(routerAddressFor(97)).to.equal("0xD99D1c33F9fC3444f8101754aBC46c52416550D1");
    expect(routerAddressFor(56n)).to.equal(PANCAKE_V2_ROUTERS[56]);
    expect(routerAddressFor(31337)).to.equal(null);
    for (const addr of Object.values(PANCAKE_V2_ROUTERS)) {
      expect(ethers.getAddress(addr)).to.equal(addr); // checksummed
    }
  });

  describe("computeMinAmounts", function () {
    it("applies slippage in basis points, rounding down", function () {
      const { amountTokenMin, amountETHMin } = computeMinAmounts(LIQ_TOKENS, LIQ_BNB, 100);
      expect(amountTokenMin).to.equal(ethers.parseUnits("79200000", 18)); // 99%
      expect(amountETHMin).to.equal(ethers.parseEther("99"));

      const half = computeMinAmounts(1000n, 3n, 50); // 0.5%
      expect(half.amountTokenMin).to.equal(995n);
      expect(half.amountETHMin).to.equal(2n); // 2.985 rounds down
    });

    it("returns the full amounts with 0 bps and accepts bigint/number/string bps", function () {
      expect(computeMinAmounts(LIQ_TOKENS, LIQ_BNB, 0)).to.deep.equal({
        amountTokenMin: LIQ_TOKENS,
        amountETHMin: LIQ_BNB,
      });
      expect(computeMinAmounts(LIQ_TOKENS, LIQ_BNB, 100n)).to.deep.equal(computeMinAmounts(LIQ_TOKENS, LIQ_BNB, "100"));
    });

    it("rejects out-of-range slippage and non-positive amounts", function () {
      expect(() => computeMinAmounts(LIQ_TOKENS, LIQ_BNB, 10_000)).to.throw(RangeError);
      expect(() => computeMinAmounts(LIQ_TOKENS, LIQ_BNB, -1)).to.throw(RangeError);
      expect(() => computeMinAmounts(0n, LIQ_BNB, 100)).to.throw(RangeError);
      expect(() => computeMinAmounts(LIQ_TOKENS, 0n, 100)).to.throw(RangeError);
      expect(() => computeMinAmounts(1.5, LIQ_BNB, 100)).to.throw(TypeError);
    });
  });

  describe("impliedPrice", function () {
    it("80,000,000 LIXI + 100 BNB -> 0.00000125 BNB per LIXI and 800,000 LIXI per BNB", function () {
      const p = impliedPrice(LIQ_TOKENS, LIQ_BNB);
      expect(p.bnbPerToken).to.equal("0.00000125");
      expect(p.tokenPerBnb).to.equal("800000");
      expect(p.bnbPerTokenWei).to.equal(ethers.parseEther("0.00000125"));
      expect(p.tokenPerBnbWei).to.equal(ethers.parseEther("800000"));
    });

    it("is consistent in both directions and handles non-terminating ratios", function () {
      const p = impliedPrice(ethers.parseUnits("3", 18), ethers.parseEther("1"));
      expect(p.tokenPerBnb).to.equal("3");
      expect(p.bnbPerToken).to.equal("0.333333333333333333"); // rounded down to 18 decimals
      expect(() => impliedPrice(0n, 1n)).to.throw(RangeError);
    });

    it("formatFixed18 trims zeros and keeps small values exact", function () {
      expect(formatFixed18(10n ** 18n)).to.equal("1");
      expect(formatFixed18(1n)).to.equal("0.000000000000000001");
      expect(formatFixed18(0n)).to.equal("0");
      expect(formatFixed18(1_500_000_000_000_000_000n)).to.equal("1.5");
    });
  });

  it("builds explorer links only for public BNB chains", function () {
    const token = "0x0000000000000000000000000000000000000001";
    const pair = "0x0000000000000000000000000000000000000002";
    const main = explorerLinks(56, { token, pair, txHash: "0xabc" });
    expect(main.tokenBscScan).to.equal(`https://bscscan.com/token/${token}`);
    expect(main.dexScreener).to.equal(`https://dexscreener.com/bsc/${pair}`);
    expect(main.pancakeSwap).to.include(token);
    expect(main.txBscScan).to.equal("https://bscscan.com/tx/0xabc");

    const test = explorerLinks(97, { token, pair });
    expect(test.tokenBscScan).to.equal(`https://testnet.bscscan.com/token/${token}`);
    expect(test.dexScreener).to.equal(undefined);

    expect(explorerLinks(31337, { token, pair })).to.deep.equal({});
  });
});

describe("add-liquidity script config (readConfig)", function () {
  const deployment = { token: { address: "0x0000000000000000000000000000000000000001" } };
  const base = { LIQUIDITY_TOKEN_AMOUNT: "80000000", LIQUIDITY_BNB_AMOUNT: "100" };

  it("reads amounts in whole units, applies defaults and picks the router per chain", function () {
    const cfg = readConfig(base, { ethers, deployment, chainId: 97n });
    expect(cfg.tokenAddress).to.equal(deployment.token.address);
    expect(cfg.tokenAmount).to.equal(LIQ_TOKENS);
    expect(cfg.bnbAmount).to.equal(LIQ_BNB);
    expect(cfg.routerAddress).to.equal(PANCAKE_V2_ROUTERS[97]);
    expect(cfg.slippageBps).to.equal(100);
    expect(cfg.deadlineMinutes).to.equal(20);
    expect(cfg.lpRecipient).to.equal(null);
    expect(cfg.confirmMainnet).to.equal(false);

    const main = readConfig({ ...base, CONFIRM_MAINNET: "yes" }, { ethers, deployment, chainId: 56n });
    expect(main.routerAddress).to.equal(PANCAKE_V2_ROUTERS[56]);
    expect(main.confirmMainnet).to.equal(true);
  });

  it("honours TOKEN_ADDRESS, ROUTER_ADDRESS, LP_RECIPIENT, SLIPPAGE_BPS and DEADLINE_MINUTES", function () {
    const env = {
      ...base,
      TOKEN_ADDRESS: "0x0000000000000000000000000000000000000009",
      ROUTER_ADDRESS: "0x0000000000000000000000000000000000000008",
      LP_RECIPIENT: "0x0000000000000000000000000000000000000007",
      SLIPPAGE_BPS: "50",
      DEADLINE_MINUTES: "5",
      LIQUIDITY_BNB_AMOUNT: "12.5",
    };
    const cfg = readConfig(env, { ethers, deployment: null, chainId: 31337n });
    expect(cfg.tokenAddress).to.equal(env.TOKEN_ADDRESS);
    expect(cfg.routerAddress).to.equal(env.ROUTER_ADDRESS);
    expect(cfg.lpRecipient).to.equal(env.LP_RECIPIENT);
    expect(cfg.slippageBps).to.equal(50);
    expect(cfg.deadlineMinutes).to.equal(5);
    expect(cfg.bnbAmount).to.equal(ethers.parseEther("12.5"));
  });

  it("rejects missing token, missing amounts, unknown chain and bad parameters", function () {
    expect(() => readConfig(base, { ethers, deployment: null, chainId: 97n })).to.throw(/TOKEN_ADDRESS/);
    expect(() => readConfig({ LIQUIDITY_BNB_AMOUNT: "1" }, { ethers, deployment, chainId: 97n })).to.throw(
      /LIQUIDITY_TOKEN_AMOUNT/
    );
    expect(() => readConfig({ LIQUIDITY_TOKEN_AMOUNT: "1" }, { ethers, deployment, chainId: 97n })).to.throw(
      /LIQUIDITY_BNB_AMOUNT/
    );
    expect(() => readConfig(base, { ethers, deployment, chainId: 31337n })).to.throw(/ROUTER_ADDRESS/);
    expect(() => readConfig({ ...base, SLIPPAGE_BPS: "10000" }, { ethers, deployment, chainId: 97n })).to.throw(
      /SLIPPAGE_BPS/
    );
    expect(() => readConfig({ ...base, DEADLINE_MINUTES: "0" }, { ethers, deployment, chainId: 97n })).to.throw(
      /DEADLINE_MINUTES/
    );
    expect(() => readConfig({ ...base, LP_RECIPIENT: "nope" }, { ethers, deployment, chainId: 97n })).to.throw(
      /LP_RECIPIENT/
    );
    expect(() => readConfig({ ...base, LP_RECIPIENT: ethers.ZeroAddress }, { ethers, deployment, chainId: 97n })).to.throw(
      /LP_RECIPIENT/
    );
    expect(() => readConfig({ ...base, LIQUIDITY_TOKEN_AMOUNT: "0" }, { ethers, deployment, chainId: 97n })).to.throw(
      /LIQUIDITY_TOKEN_AMOUNT/
    );
  });
});

describe("add-liquidity script (end to end against mock router on hardhat network)", function () {
  async function deployFixture() {
    const [deployer, treasury, lpVault] = await ethers.getSigners();

    // Token with the deployer holding the liquidity allocation (as after a treasury transfer).
    const token = await (await ethers.getContractFactory("LiXi")).deploy(treasury.address);
    await token.connect(treasury).transfer(deployer.address, LIQ_TOKENS * 2n);
    const tokenAddress = await token.getAddress();

    // Test-only PancakeSwap stand-ins (contracts/test/Mock*.sol).
    const weth = await (await ethers.getContractFactory("MockWETH")).deploy();
    const factory = await (await ethers.getContractFactory("MockFactory")).deploy();
    const router = await (await ethers.getContractFactory("MockRouter")).deploy(
      await factory.getAddress(),
      await weth.getAddress()
    );
    const pair = await (await ethers.getContractFactory("MockPair")).deploy(
      await router.getAddress(),
      tokenAddress,
      await weth.getAddress()
    );
    await factory.setPair(await pair.getAddress());

    return { deployer, treasury, lpVault, token, tokenAddress, weth, factory, router, pair };
  }

  function run(overrides) {
    const logs = [];
    const promise = addLiquidity({
      hre,
      tokenAmount: LIQ_TOKENS,
      bnbAmount: LIQ_BNB,
      log: (line) => logs.push(String(line)),
      ...overrides,
    });
    return promise.then((result) => ({ result, logs }));
  }

  it("approves the router, calls addLiquidityETH with slippage bounds and reports the pair", async function () {
    const { deployer, lpVault, token, tokenAddress, router, pair, factory, weth } = await loadFixture(deployFixture);
    const routerAddress = await router.getAddress();
    const pairAddress = await pair.getAddress();

    const bnbBefore = await ethers.provider.getBalance(deployer.address);
    const { result, logs } = await run({
      signer: deployer,
      tokenAddress,
      routerAddress,
      lpRecipient: lpVault.address,
      slippageBps: 100,
      deadlineMinutes: 20,
    });

    // The router saw exactly what the script computed.
    const call = await router.lastCall();
    expect(await router.callCount()).to.equal(1n);
    expect(call.caller).to.equal(deployer.address);
    expect(call.token).to.equal(tokenAddress);
    expect(call.amountTokenDesired).to.equal(LIQ_TOKENS);
    expect(call.amountTokenMin).to.equal(ethers.parseUnits("79200000", 18));
    expect(call.amountETHMin).to.equal(ethers.parseEther("99"));
    expect(call.to).to.equal(lpVault.address);
    expect(call.value).to.equal(LIQ_BNB);
    const block = await ethers.provider.getBlock("latest");
    expect(call.deadline).to.be.gte(BigInt(block.timestamp));
    expect(call.deadline).to.be.lte(BigInt(block.timestamp) + 20n * 60n + 5n);

    // Tokens moved from the signer into the pair via the router's transferFrom;
    // the exact-amount approval is fully consumed.
    expect(await token.balanceOf(pairAddress)).to.equal(LIQ_TOKENS);
    expect(await token.balanceOf(deployer.address)).to.equal(LIQ_TOKENS);
    expect(await token.allowance(deployer.address, routerAddress)).to.equal(0n);
    expect(bnbBefore - (await ethers.provider.getBalance(deployer.address))).to.be.gte(LIQ_BNB);

    // LP tokens went to the recipient, and the script reports them.
    const lp = await pair.balanceOf(lpVault.address);
    expect(lp).to.be.gt(0n);
    expect(lp).to.equal(call.liquidity);
    expect(result.lpMinted).to.equal(lp);
    expect(result.lpBalance).to.equal(lp);
    expect(await pair.balanceOf(deployer.address)).to.equal(0n);

    // Result object.
    expect(result.chainId).to.equal(31337);
    expect(result.pairAddress).to.equal(pairAddress);
    expect(result.routerAddress).to.equal(routerAddress);
    expect(result.factoryAddress).to.equal(await factory.getAddress());
    expect(result.wethAddress).to.equal(await weth.getAddress());
    expect(result.lpRecipient).to.equal(lpVault.address);
    expect(result.symbol).to.equal("LIXI");
    expect(result.approveTxHash).to.match(/^0x[0-9a-f]{64}$/);
    expect(result.txHash).to.match(/^0x[0-9a-f]{64}$/);
    expect(result.amountTokenMin).to.equal(call.amountTokenMin);
    expect(result.amountETHMin).to.equal(call.amountETHMin);
    expect(result.reserves).to.deep.equal({ token: LIQ_TOKENS, bnb: LIQ_BNB });
    expect(result.price.bnbPerToken).to.equal("0.00000125");
    expect(result.price.tokenPerBnb).to.equal("800000");
    expect(result.links).to.deep.equal({}); // no explorer for chainId 31337

    // Printed summary.
    const out = logs.join("\n");
    expect(out).to.include(`Pair (LP token): ${pairAddress}`);
    expect(out).to.include("1 LIXI = 0.00000125 BNB ; 1 BNB = 800000 LIXI");
    expect(out).to.include("80,000,000 LIXI");
    expect(out).to.include("Approve tx");

    // Deployment record is plain JSON with stringified bigints.
    const record = buildLiquidityRecord(result);
    expect(record.pair).to.equal(pairAddress);
    expect(record.lpToken).to.equal(pairAddress);
    expect(record.router).to.equal(routerAddress);
    expect(record.tokenAmount).to.equal(LIQ_TOKENS.toString());
    expect(record.bnbAmount).to.equal(LIQ_BNB.toString());
    expect(record.lpMinted).to.equal(lp.toString());
    expect(record.priceBnbPerToken).to.equal("0.00000125");
    expect(() => JSON.stringify(record)).to.not.throw();
  });

  it("skips the approve when the allowance already suffices and defaults the LP recipient to the signer", async function () {
    const { deployer, token, tokenAddress, router, pair } = await loadFixture(deployFixture);
    const routerAddress = await router.getAddress();
    await token.connect(deployer).approve(routerAddress, LIQ_TOKENS);

    const { result, logs } = await run({ signer: deployer, tokenAddress, routerAddress });
    expect(result.approveTxHash).to.equal(null);
    expect(logs.join("\n")).to.include("skipping approve");
    expect(result.lpRecipient).to.equal(deployer.address);
    expect(await pair.balanceOf(deployer.address)).to.equal(result.lpMinted);
    expect((await router.lastCall()).to).to.equal(deployer.address);
  });

  it("warns when the pool already has reserves and tracks LP minted vs total balance", async function () {
    const { deployer, tokenAddress, router, pair } = await loadFixture(deployFixture);
    const routerAddress = await router.getAddress();

    const first = await run({ signer: deployer, tokenAddress, routerAddress, tokenAmount: LIQ_TOKENS / 2n, bnbAmount: LIQ_BNB / 2n });
    expect(first.logs.join("\n")).to.not.include("already has reserves");

    const second = await run({ signer: deployer, tokenAddress, routerAddress, tokenAmount: LIQ_TOKENS / 2n, bnbAmount: LIQ_BNB / 2n });
    expect(second.logs.join("\n")).to.include("already has reserves");
    expect(second.result.lpBalance).to.equal(first.result.lpMinted + second.result.lpMinted);
    expect(await pair.balanceOf(deployer.address)).to.equal(second.result.lpBalance);
    expect(await router.callCount()).to.equal(2n);
  });

  it("refuses to run when the signer lacks tokens or BNB, or the addresses are wrong", async function () {
    const { deployer, treasury, lpVault, tokenAddress, router } = await loadFixture(deployFixture);
    const routerAddress = await router.getAddress();

    // lpVault holds no LIXI.
    await expect(run({ signer: lpVault, tokenAddress, routerAddress })).to.be.rejectedWith(/holds 0 LIXI/);

    // treasury holds LIXI but not 1,000,000 BNB.
    await expect(
      run({ signer: treasury, tokenAddress, routerAddress, bnbAmount: ethers.parseEther("1000000") })
    ).to.be.rejectedWith(/BNB plus gas/);

    // No contract at the router address.
    await expect(run({ signer: deployer, tokenAddress, routerAddress: lpVault.address })).to.be.rejectedWith(
      /No contract code at router/
    );
    await expect(run({ signer: deployer, tokenAddress, routerAddress: "not-an-address" })).to.be.rejectedWith(
      /Invalid router address/
    );
    await expect(run({ signer: deployer, tokenAddress, routerAddress, lpRecipient: ethers.ZeroAddress })).to.be.rejectedWith(
      /Invalid LP recipient/
    );
    // Nothing was sent.
    expect(await router.callCount()).to.equal(0n);
  });

  it("propagates a router revert (e.g. expired deadline) without approving twice", async function () {
    const { deployer, token, tokenAddress, router } = await loadFixture(deployFixture);
    const routerAddress = await router.getAddress();
    // Point the factory at no pair so the mock router reverts with PairNotSet.
    const factory = await ethers.getContractAt("MockFactory", await router.factory());
    await factory.setPair(ethers.ZeroAddress);

    await expect(run({ signer: deployer, tokenAddress, routerAddress })).to.be.rejectedWith(/PairNotSet|reverted/);
    // The approval happened before the failed call; a retry will reuse it.
    expect(await token.allowance(deployer.address, routerAddress)).to.equal(LIQ_TOKENS);
    expect(await router.callCount()).to.equal(0n);
  });
});
