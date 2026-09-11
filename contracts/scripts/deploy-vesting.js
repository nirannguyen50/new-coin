// Deploys one OpenZeppelin VestingWallet (via LiXiVestingWallet) per
// allocation bucket defined in a JSON config, then prints a table of wallets
// and amounts. Cliff semantics: wallet.start = TGE + cliffMonths, duration =
// vestingMonths (same model as tokenomics/unlock_schedule.py). Usage:
//   npm run deploy:vesting:testnet
//   npm run deploy:vesting:mainnet
// Env: ALLOCATIONS_FILE (default config/allocations.example.json),
//      TGE_TIMESTAMP (optional), FUND_VESTING=true (optional, see .env.example),
//      TOKEN_ADDRESS (optional override; default read from deployments/<network>.json).
const fs = require("fs");
const path = require("path");
const hre = require("hardhat");
const { buildAllocationPlan } = require("./lib/allocations");
const { loadDeployment, saveDeployment } = require("./lib/deployments");

function fmt(amount) {
  // 1,234,567.89 style formatting of an 18-decimal bigint.
  const s = hre.ethers.formatUnits(amount, 18);
  const [whole, frac = ""] = s.split(".");
  const trimmed = frac.replace(/0+$/, "");
  return whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (trimmed ? "." + trimmed : "");
}

function pad(str, width, right = false) {
  str = String(str);
  return right ? str.padStart(width) : str.padEnd(width);
}

function printTable(rows, columns) {
  const widths = columns.map((c) => Math.max(c.header.length, ...rows.map((r) => String(r[c.key]).length)));
  const line = (cells) => "| " + cells.map((cell, i) => pad(cell, widths[i], columns[i].right)).join(" | ") + " |";
  const sep = "|-" + widths.map((w) => "-".repeat(w)).join("-|-") + "-|";
  console.log(line(columns.map((c) => c.header)));
  console.log(sep);
  for (const r of rows) console.log(line(columns.map((c) => r[c.key])));
}

async function main() {
  const { ethers, network } = hre;
  const [signer] = await ethers.getSigners();
  if (!signer) throw new Error("No signer configured - set PRIVATE_KEY in .env");

  // --- Locate the token -----------------------------------------------------
  const deployment = loadDeployment(network.name);
  const tokenAddress = process.env.TOKEN_ADDRESS || deployment?.token?.address;
  if (!tokenAddress || !ethers.isAddress(tokenAddress)) {
    throw new Error(
      `No LiXi deployment found for network "${network.name}". Run the token deploy first or set TOKEN_ADDRESS.`
    );
  }
  const token = await ethers.getContractAt("LiXi", tokenAddress);
  const totalSupply = await token.totalSupply();

  // --- Load and validate config --------------------------------------------
  const configPath = path.resolve(process.env.ALLOCATIONS_FILE || "config/allocations.example.json");
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

  const latest = await ethers.provider.getBlock("latest");
  const tge = process.env.TGE_TIMESTAMP ? BigInt(process.env.TGE_TIMESTAMP) : BigInt(latest.timestamp);
  if (tge < BigInt(latest.timestamp) - 30n * 24n * 3600n) {
    throw new Error("TGE_TIMESTAMP is more than 30 days in the past - double check the value");
  }

  const { plan, dust } = buildAllocationPlan(config, totalSupply, tge, ethers.isAddress);
  const fund = process.env.FUND_VESTING === "true";

  console.log("Network        :", network.name);
  console.log("Signer         :", signer.address);
  console.log("Token          :", tokenAddress);
  console.log("Total supply   :", fmt(totalSupply), "LIXI");
  console.log("Config         :", configPath);
  console.log("TGE timestamp  :", tge.toString(), `(${new Date(Number(tge) * 1000).toISOString()})`);
  console.log("Fund wallets   :", fund ? "yes (transfer from signer)" : "no (print transfers only)");
  if (dust > 0n) console.log("Rounding dust  :", dust.toString(), "wei stays with the sender");

  if (fund) {
    const needed = plan.reduce((acc, p) => acc + p.bucketAmount, 0n);
    const have = await token.balanceOf(signer.address);
    if (have < needed) {
      throw new Error(
        `FUND_VESTING=true but signer holds ${fmt(have)} LIXI, needs ${fmt(needed)} LIXI. ` +
          "Either run from the treasury or leave FUND_VESTING empty and execute transfers from the multisig."
      );
    }
  }

  // --- Deploy wallets --------------------------------------------------------
  const Wallet = await ethers.getContractFactory("LiXiVestingWallet");
  const confirmations = network.name === "hardhat" || network.name === "localhost" ? 1 : 2;
  const results = [];

  for (const p of plan) {
    let walletAddress = "-";
    let constructorArgs = null;
    if (p.needsWallet) {
      process.stdout.write(`Deploying vesting wallet for "${p.name}"... `);
      constructorArgs = [p.beneficiary, p.start.toString(), p.durationSeconds.toString()];
      const wallet = await Wallet.deploy(p.beneficiary, p.start, p.durationSeconds);
      await wallet.deploymentTransaction().wait(confirmations);
      walletAddress = await wallet.getAddress();
      console.log(walletAddress);
    }
    results.push({ ...p, walletAddress, constructorArgs });
  }

  // --- Fund (optional) -------------------------------------------------------
  if (fund) {
    for (const r of results) {
      if (r.tgeAmount > 0n) {
        process.stdout.write(`Transfer ${fmt(r.tgeAmount)} LIXI (TGE unlock) -> ${r.beneficiary}... `);
        const tx = await token.transfer(r.beneficiary, r.tgeAmount);
        await tx.wait(confirmations);
        console.log(tx.hash);
      }
      if (r.vestedAmount > 0n) {
        process.stdout.write(`Transfer ${fmt(r.vestedAmount)} LIXI (vesting) -> ${r.walletAddress}... `);
        const tx = await token.transfer(r.walletAddress, r.vestedAmount);
        await tx.wait(confirmations);
        console.log(tx.hash);
      }
    }
  }

  // --- Table -----------------------------------------------------------------
  console.log("\nAllocation summary");
  printTable(
    results.map((r) => ({
      name: r.name,
      percent: (Number(r.percentBps) / 100).toFixed(2) + "%",
      total: fmt(r.bucketAmount),
      tge: fmt(r.tgeAmount),
      vested: fmt(r.vestedAmount),
      cliff: r.needsWallet ? `${r.cliffMonths} mo` : "-",
      vesting: r.needsWallet ? `${r.vestingMonths} mo` : "-",
      unlocked: r.needsWallet ? `M${r.cliffMonths + r.vestingMonths}` : "TGE",
      beneficiary: r.beneficiary,
      wallet: r.walletAddress,
    })),
    [
      { key: "name", header: "Bucket" },
      { key: "percent", header: "% supply", right: true },
      { key: "total", header: "Total LIXI", right: true },
      { key: "tge", header: "TGE unlock", right: true },
      { key: "vested", header: "In vesting", right: true },
      { key: "cliff", header: "Cliff", right: true },
      { key: "vesting", header: "Vesting", right: true },
      { key: "unlocked", header: "Fully unlocked", right: true },
      { key: "beneficiary", header: "Beneficiary" },
      { key: "wallet", header: "Vesting wallet" },
    ]
  );

  if (!fund) {
    console.log("\nTransfers to execute from the treasury (e.g. via Safe multisig, token = " + tokenAddress + "):");
    for (const r of results) {
      if (r.tgeAmount > 0n) console.log(`  transfer(${r.beneficiary}, ${r.tgeAmount})   # ${r.name} - TGE unlock`);
      if (r.vestedAmount > 0n) console.log(`  transfer(${r.walletAddress}, ${r.vestedAmount})   # ${r.name} - vesting`);
    }
  }

  // --- Persist ---------------------------------------------------------------
  if (deployment && deployment.token?.address?.toLowerCase() === tokenAddress.toLowerCase()) {
    deployment.vestingWallets = results
      .filter((r) => r.needsWallet)
      .map((r) => ({
        contract: "LiXiVestingWallet",
        name: r.name,
        address: r.walletAddress,
        beneficiary: r.beneficiary,
        amount: r.vestedAmount.toString(),
        start: r.start.toString(),
        end: r.end.toString(),
        constructorArgs: r.constructorArgs,
      }));
    deployment.tgeTimestamp = tge.toString();
    const file = saveDeployment(network.name, deployment);
    console.log("\nSaved vesting wallets to", file);
    if (network.name !== "hardhat") console.log(`Verify them with: npm run verify -- --network ${network.name}`);
  }

  return results;
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}

module.exports = { main };
