// Verifies the token and every vesting wallet recorded in deployments/<network>.json.
// Usage: npm run verify -- --network bscTestnet   (or bsc)
const hre = require("hardhat");
const { loadDeployment } = require("./lib/deployments");

async function verifyOne(label, address, constructorArguments, contract) {
  process.stdout.write(`Verifying ${label} at ${address}... `);
  try {
    await hre.run("verify:verify", { address, constructorArguments, contract });
    console.log("ok");
  } catch (err) {
    const msg = String(err.message || err);
    if (/already verified/i.test(msg)) console.log("already verified");
    else {
      console.log("FAILED");
      console.error("  " + msg.split("\n")[0]);
      process.exitCode = 1;
    }
  }
}

async function main() {
  const name = hre.network.name;
  if (!["bsc", "bscTestnet"].includes(name)) {
    throw new Error(`verify.js must run with --network bsc or --network bscTestnet (got "${name}")`);
  }
  if (!process.env.BSCSCAN_API_KEY) throw new Error("BSCSCAN_API_KEY is missing in .env");

  const d = loadDeployment(name);
  if (!d?.token?.address) throw new Error(`No deployment record found for ${name} (deployments/${name}.json)`);

  await verifyOne("LiXi", d.token.address, d.token.constructorArgs, "contracts/LiXi.sol:LiXi");

  for (const w of d.vestingWallets || []) {
    await verifyOne(
      `vesting wallet "${w.name}"`,
      w.address,
      w.constructorArgs,
      "contracts/LiXiVestingWallet.sol:LiXiVestingWallet"
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
