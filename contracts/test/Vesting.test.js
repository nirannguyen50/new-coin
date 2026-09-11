const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { buildAllocationPlan, SECONDS_PER_MONTH } = require("../scripts/lib/allocations");

const MONTH = Number(SECONDS_PER_MONTH);
const TOTAL_SUPPLY = 1_000_000_000n * 10n ** 18n;

describe("LiXiVestingWallet (OpenZeppelin VestingWallet, cliff = delayed start)", function () {
  // Team bucket from tokenomics/config.example.json: 12-month full lock, then 36 months linear.
  const CLIFF_MONTHS = 12;
  const VESTING_MONTHS = 36;
  const ALLOCATION = ethers.parseUnits("180000000", 18); // 18% of supply

  async function deployFixture() {
    const [deployer, treasury, beneficiary, other] = await ethers.getSigners();
    const token = await (await ethers.getContractFactory("LiXi")).deploy(treasury.address);

    const tge = BigInt((await time.latest()) + 3600); // TGE one hour from now
    const cliff = BigInt(CLIFF_MONTHS * MONTH);
    const duration = BigInt(VESTING_MONTHS * MONTH);
    const start = tge + cliff; // linear vesting begins when the cliff ends

    const wallet = await (
      await ethers.getContractFactory("LiXiVestingWallet")
    ).deploy(beneficiary.address, start, duration);

    await token.connect(treasury).transfer(await wallet.getAddress(), ALLOCATION);
    return { token, wallet, treasury, beneficiary, other, tge, cliff, start, duration };
  }

  it("stores schedule parameters and holds the allocation", async function () {
    const { token, wallet, beneficiary, tge, cliff, start, duration } = await loadFixture(deployFixture);
    expect(await wallet.start()).to.equal(start);
    expect(await wallet.start()).to.equal(tge + cliff);
    expect(await wallet.duration()).to.equal(duration);
    expect(await wallet.end()).to.equal(tge + cliff + duration); // month 48 for the team bucket
    expect(await wallet.owner()).to.equal(beneficiary.address);
    expect(await token.balanceOf(await wallet.getAddress())).to.equal(ALLOCATION);
  });

  it("releases nothing before the cliff", async function () {
    const { token, wallet, beneficiary, tge, cliff, start } = await loadFixture(deployFixture);
    const tokenAddr = await token.getAddress();

    // Pure schedule checks at explicit timestamps.
    expect(await wallet["vestedAmount(address,uint64)"](tokenAddr, tge)).to.equal(0n);
    expect(await wallet["vestedAmount(address,uint64)"](tokenAddr, tge + cliff / 2n)).to.equal(0n);
    expect(await wallet["vestedAmount(address,uint64)"](tokenAddr, start - 1n)).to.equal(0n);

    // Before TGE
    expect(await wallet["releasable(address)"](tokenAddr)).to.equal(0n);

    // Halfway through the cliff
    await time.increaseTo(tge + cliff / 2n);
    expect(await wallet["releasable(address)"](tokenAddr)).to.equal(0n);

    // A release() mined one second before the cliff ends moves nothing.
    await time.setNextBlockTimestamp(start - 1n);
    await wallet["release(address)"](tokenAddr);
    expect(await token.balanceOf(beneficiary.address)).to.equal(0n);
    expect(await wallet["released(address)"](tokenAddr)).to.equal(0n);
  });

  it("has exactly 0 releasable at the cliff (no bump)", async function () {
    const { token, wallet, beneficiary, start } = await loadFixture(deployFixture);
    const tokenAddr = await token.getAddress();

    expect(await wallet["vestedAmount(address,uint64)"](tokenAddr, start)).to.equal(0n);

    await time.setNextBlockTimestamp(start);
    await wallet["release(address)"](tokenAddr);
    expect(await token.balanceOf(beneficiary.address)).to.equal(0n);
    expect(await wallet["released(address)"](tokenAddr)).to.equal(0n);
  });

  it("vests linearly after the cliff: 50% halfway through the vesting period", async function () {
    const { token, wallet, beneficiary, other, start, duration } = await loadFixture(deployFixture);
    const tokenAddr = await token.getAddress();

    // One month after the cliff: 1/36 of the allocation.
    const oneMonthIn = start + BigInt(MONTH);
    const afterOneMonth = ALLOCATION / BigInt(VESTING_MONTHS);
    expect(await wallet["vestedAmount(address,uint64)"](tokenAddr, oneMonthIn)).to.equal(afterOneMonth);

    // Anyone can trigger release; tokens always go to the beneficiary.
    await time.setNextBlockTimestamp(oneMonthIn);
    await expect(wallet.connect(other)["release(address)"](tokenAddr))
      .to.emit(wallet, "ERC20Released")
      .withArgs(tokenAddr, afterOneMonth);
    expect(await token.balanceOf(beneficiary.address)).to.equal(afterOneMonth);
    expect(await token.balanceOf(other.address)).to.equal(0n);

    // Halfway through the vesting period: exactly 50%.
    const halfway = start + duration / 2n;
    expect(await wallet["vestedAmount(address,uint64)"](tokenAddr, halfway)).to.equal(ALLOCATION / 2n);
    await time.setNextBlockTimestamp(halfway);
    await expect(wallet["release(address)"](tokenAddr))
      .to.emit(wallet, "ERC20Released")
      .withArgs(tokenAddr, ALLOCATION / 2n - afterOneMonth);
    expect(await token.balanceOf(beneficiary.address)).to.equal(ALLOCATION / 2n);

    // A few more points: vested(t) == allocation * (t - start) / duration
    for (const months of [24, 30]) {
      const t = start + BigInt(months * MONTH);
      const expected = (ALLOCATION * (t - start)) / duration;
      expect(await wallet["vestedAmount(address,uint64)"](tokenAddr, t)).to.equal(expected);
      await time.setNextBlockTimestamp(t);
      await wallet["release(address)"](tokenAddr);
      expect(await token.balanceOf(beneficiary.address)).to.equal(expected);
    }
  });

  it("releases everything at cliff + vesting and nothing more afterwards", async function () {
    const { token, wallet, beneficiary, tge, cliff, start, duration } = await loadFixture(deployFixture);
    const tokenAddr = await token.getAddress();

    const end = start + duration;
    expect(end).to.equal(tge + BigInt((CLIFF_MONTHS + VESTING_MONTHS) * MONTH)); // month 48
    expect(await wallet["vestedAmount(address,uint64)"](tokenAddr, end - 1n)).to.be.lt(ALLOCATION);
    expect(await wallet["vestedAmount(address,uint64)"](tokenAddr, end)).to.equal(ALLOCATION);

    await time.setNextBlockTimestamp(end);
    await wallet["release(address)"](tokenAddr);
    expect(await token.balanceOf(beneficiary.address)).to.equal(ALLOCATION);
    expect(await token.balanceOf(await wallet.getAddress())).to.equal(0n);

    await time.increase(365 * 24 * 3600);
    expect(await wallet["releasable(address)"](tokenAddr)).to.equal(0n);
    await wallet["release(address)"](tokenAddr);
    expect(await token.balanceOf(beneficiary.address)).to.equal(ALLOCATION);
  });

  it("with zero cliff vests linearly from TGE", async function () {
    const [, treasury, beneficiary] = await ethers.getSigners();
    const token = await (await ethers.getContractFactory("LiXi")).deploy(treasury.address);
    const tokenAddr = await token.getAddress();
    const tge = BigInt((await time.latest()) + 100);
    const duration = BigInt(10 * MONTH);
    const wallet = await (
      await ethers.getContractFactory("LiXiVestingWallet")
    ).deploy(beneficiary.address, tge, duration);
    const amount = ethers.parseUnits("1000", 18);
    await token.connect(treasury).transfer(await wallet.getAddress(), amount);

    expect(await wallet.start()).to.equal(tge);
    expect(await wallet["vestedAmount(address,uint64)"](tokenAddr, tge + duration / 4n)).to.equal(amount / 4n);
    await time.increaseTo(tge + duration / 4n);
    expect(await wallet["releasable(address)"](tokenAddr)).to.be.gte(amount / 4n);
  });

  it("with zero duration unlocks everything at once when the cliff ends", async function () {
    const [, treasury, beneficiary] = await ethers.getSigners();
    const token = await (await ethers.getContractFactory("LiXi")).deploy(treasury.address);
    const tokenAddr = await token.getAddress();
    const tge = BigInt((await time.latest()) + 100);
    const cliff = BigInt(3 * MONTH);
    const wallet = await (
      await ethers.getContractFactory("LiXiVestingWallet")
    ).deploy(beneficiary.address, tge + cliff, 0n);
    const amount = ethers.parseUnits("1000", 18);
    await token.connect(treasury).transfer(await wallet.getAddress(), amount);

    expect(await wallet["vestedAmount(address,uint64)"](tokenAddr, tge + cliff - 1n)).to.equal(0n);
    expect(await wallet["vestedAmount(address,uint64)"](tokenAddr, tge + cliff)).to.equal(amount);
    await time.setNextBlockTimestamp(tge + cliff);
    await wallet["release(address)"](tokenAddr);
    expect(await token.balanceOf(beneficiary.address)).to.equal(amount);
  });
});

describe("allocation plan (scripts/lib/allocations.js)", function () {
  const tge = 1_800_000_000n;

  function bucket(overrides) {
    return {
      name: "Bucket",
      beneficiary: "0x0000000000000000000000000000000000000001",
      percent: 100,
      tgeUnlockPercent: 0,
      cliffMonths: 0,
      vestingMonths: 12,
      ...overrides,
    };
  }

  it("mirrors tokenomics/config.example.json (buckets, percents, cliff/vesting)", async function () {
    const ours = require("../config/allocations.example.json").allocations;
    const theirs = require("../../tokenomics/config.example.json").buckets;
    expect(ours.map((b) => b.key)).to.deep.equal(theirs.map((b) => b.key));
    for (const [i, t] of theirs.entries()) {
      expect(ours[i].percent, `${t.key}.percent`).to.equal(t.pct);
      expect(ours[i].tgeUnlockPercent, `${t.key}.tgeUnlockPercent`).to.equal(t.tge_unlock_pct);
      expect(ours[i].cliffMonths, `${t.key}.cliffMonths`).to.equal(t.cliff_months);
      expect(ours[i].vestingMonths, `${t.key}.vestingMonths`).to.equal(t.vesting_months);
    }
  });

  it("computes amounts, TGE unlock and schedule from the example config", async function () {
    const config = require("../config/allocations.example.json");
    const { plan, dust } = buildAllocationPlan(config, TOTAL_SUPPLY, tge, ethers.isAddress);

    expect(plan.reduce((a, p) => a + p.bucketAmount, 0n) + dust).to.equal(TOTAL_SUPPLY);
    expect(dust).to.equal(0n);

    // Team: cliff 12 / vesting 36 -> linear from month 12, fully unlocked at month 48.
    const team = plan.find((p) => p.key === "team_advisors");
    expect(team.bucketAmount).to.equal(ethers.parseUnits("180000000", 18));
    expect(team.tgeAmount).to.equal(0n);
    expect(team.vestedAmount).to.equal(team.bucketAmount);
    expect(team.start).to.equal(tge + 12n * SECONDS_PER_MONTH);
    expect(team.durationSeconds).to.equal(36n * SECONDS_PER_MONTH);
    expect(team.end).to.equal(tge + 48n * SECONDS_PER_MONTH);
    expect(team.needsWallet).to.equal(true);

    // Investors: cliff 9 / vesting 24 -> month 33.
    const investors = plan.find((p) => p.key === "investors");
    expect(investors.start).to.equal(tge + 9n * SECONDS_PER_MONTH);
    expect(investors.end).to.equal(tge + 33n * SECONDS_PER_MONTH);

    const liquidity = plan.find((p) => p.key === "liquidity");
    expect(liquidity.tgeAmount).to.equal(ethers.parseUnits("80000000", 18));
    expect(liquidity.vestedAmount).to.equal(0n);
    expect(liquidity.needsWallet).to.equal(false);

    const community = plan.find((p) => p.key === "community_ecosystem");
    expect(community.tgeAmount).to.equal(ethers.parseUnits("16000000", 18)); // 5% of 320M
    expect(community.vestedAmount).to.equal(ethers.parseUnits("304000000", 18));
    expect(community.start).to.equal(tge);
    expect(community.end).to.equal(tge + 48n * SECONDS_PER_MONTH);

    const treasury = plan.find((p) => p.key === "treasury");
    expect(treasury.tgeAmount).to.equal(ethers.parseUnits("2600000", 18)); // 2% of 130M

    // TGE circulating = 16M + 2.6M + 80M + 10M + 40M = 148.6M (14.86%), same as tokenomics/unlock_schedule.py.
    const tgeCirculating = plan.reduce((a, p) => a + p.tgeAmount, 0n);
    expect(tgeCirculating).to.equal(ethers.parseUnits("148600000", 18));
  });

  it("supports a single unlock at the cliff (vestingMonths = 0, cliffMonths > 0)", async function () {
    const config = { allocations: [bucket({ cliffMonths: 3, vestingMonths: 0 })] };
    const { plan } = buildAllocationPlan(config, TOTAL_SUPPLY, tge, ethers.isAddress);
    expect(plan[0].needsWallet).to.equal(true);
    expect(plan[0].start).to.equal(tge + 3n * SECONDS_PER_MONTH);
    expect(plan[0].durationSeconds).to.equal(0n);
    expect(plan[0].end).to.equal(plan[0].start);
  });

  it("treats cliff 0 / vesting 0 as fully liquid at TGE without a wallet", async function () {
    const config = { allocations: [bucket({ cliffMonths: 0, vestingMonths: 0, tgeUnlockPercent: 50 })] };
    const { plan } = buildAllocationPlan(config, TOTAL_SUPPLY, tge, ethers.isAddress);
    expect(plan[0].needsWallet).to.equal(false);
    expect(plan[0].tgeAmount).to.equal(TOTAL_SUPPLY);
    expect(plan[0].vestedAmount).to.equal(0n);
  });

  it("supports fractional percents with two decimals", async function () {
    const config = { allocations: [bucket({ percent: "33.33" }), bucket({ percent: "66.67" })] };
    const { plan } = buildAllocationPlan(config, TOTAL_SUPPLY, tge, ethers.isAddress);
    expect(plan[0].bucketAmount).to.equal(ethers.parseUnits("333300000", 18));
    expect(plan[1].bucketAmount).to.equal(ethers.parseUnits("666700000", 18));
  });

  it("rejects configs that do not sum to 100%", async function () {
    const config = { allocations: [bucket({ percent: 60 }), bucket({ percent: 30 })] };
    expect(() => buildAllocationPlan(config, TOTAL_SUPPLY, tge, ethers.isAddress)).to.throw(/sum to exactly 100/);
  });

  it("rejects invalid schedules and addresses", async function () {
    const run = (b) => () => buildAllocationPlan({ allocations: [b] }, TOTAL_SUPPLY, tge, ethers.isAddress);
    expect(run(bucket({ cliffMonths: -1 }))).to.throw(/cliffMonths must be a non-negative integer/);
    expect(run(bucket({ vestingMonths: 1.5 }))).to.throw(/vestingMonths must be a non-negative integer/);
    expect(run(bucket({ tgeUnlockPercent: 101 }))).to.throw(/cannot exceed 100/);
    expect(run(bucket({ percent: "12.345" }))).to.throw(/at most 2 decimal places/);
    expect(run(bucket({ beneficiary: "0xnope" }))).to.throw(/invalid beneficiary/);
    expect(run(bucket({ beneficiary: ethers.ZeroAddress }))).to.throw(/zero address/);
  });
});

describe("deploy-vesting script (end to end on hardhat network)", function () {
  it("deploys wallets from the example config, funds them and prints a table", async function () {
    const [deployer, treasury] = await ethers.getSigners();
    const token = await (await ethers.getContractFactory("LiXi")).deploy(treasury.address);
    const tokenAddr = await token.getAddress();
    // Give the deployer the supply so FUND_VESTING can transfer from it.
    await token.connect(treasury).transfer(deployer.address, TOTAL_SUPPLY);

    const tge = BigInt((await time.latest()) + 3600);
    const prev = { ...process.env };
    process.env.TOKEN_ADDRESS = tokenAddr;
    process.env.ALLOCATIONS_FILE = "config/allocations.example.json";
    process.env.FUND_VESTING = "true";
    process.env.TGE_TIMESTAMP = tge.toString();

    // Capture the script output instead of polluting the test report.
    const logs = [];
    const origLog = console.log;
    const origWrite = process.stdout.write;
    console.log = (...a) => logs.push(a.join(" "));
    process.stdout.write = () => true;
    let results;
    try {
      results = await require("../scripts/deploy-vesting").main();
    } finally {
      console.log = origLog;
      process.stdout.write = origWrite;
      process.env = prev;
    }

    const config = require("../config/allocations.example.json");
    expect(results.length).to.equal(config.allocations.length);

    for (const r of results) {
      if (r.needsWallet) {
        expect(ethers.isAddress(r.walletAddress)).to.equal(true);
        expect(await token.balanceOf(r.walletAddress)).to.equal(r.vestedAmount);
        const wallet = await ethers.getContractAt("LiXiVestingWallet", r.walletAddress);
        expect(await wallet.owner()).to.equal(r.beneficiary);
        expect(await wallet.start()).to.equal(tge + BigInt(r.cliffMonths) * SECONDS_PER_MONTH);
        expect(await wallet.duration()).to.equal(BigInt(r.vestingMonths) * SECONDS_PER_MONTH);
        expect(await wallet.end()).to.equal(r.end);
      } else {
        expect(await token.balanceOf(r.beneficiary)).to.be.gte(r.bucketAmount);
      }
    }
    // Everything the deployer held has been distributed.
    expect(await token.balanceOf(deployer.address)).to.equal(0n);

    const table = logs.join("\n");
    expect(table).to.include("| Bucket");
    expect(table).to.include("Đội ngũ & cố vấn");
    expect(table).to.include("180,000,000");
    expect(table).to.include("M48"); // team fully unlocked at month 48
  });
});
