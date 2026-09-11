// Deploys the LiXi token. Usage:
//   npm run deploy:testnet   (chainId 97)
//   npm run deploy:mainnet   (chainId 56)
// Requires PRIVATE_KEY and TREASURY_ADDRESS in .env.
const hre = require("hardhat");
const { loadDeployment, saveDeployment } = require("./lib/deployments");

async function main() {
  const { ethers, network } = hre;
  const treasury = process.env.TREASURY_ADDRESS;

  if (!treasury || !ethers.isAddress(treasury)) {
    throw new Error("TREASURY_ADDRESS is missing or not a valid address (check .env)");
  }
  if (treasury === ethers.ZeroAddress) {
    throw new Error("TREASURY_ADDRESS cannot be the zero address");
  }

  const [deployer] = await ethers.getSigners();
  if (!deployer) throw new Error("No signer configured - set PRIVATE_KEY in .env");

  const chainId = (await ethers.provider.getNetwork()).chainId;
  const balance = await ethers.provider.getBalance(deployer.address);

  console.log("Network       :", network.name, `(chainId ${chainId})`);
  console.log("Deployer      :", deployer.address);
  console.log("Deployer BNB  :", ethers.formatEther(balance));
  console.log("Treasury      :", treasury);

  if (chainId === 56n) {
    const code = await ethers.provider.getCode(treasury);
    if (code === "0x") {
      console.warn(
        "\n[WARNING] TREASURY_ADDRESS has no contract code on BNB mainnet. " +
          "The plan requires a multisig (e.g. Safe) treasury. Continue only if this is intentional.\n"
      );
    }
  }

  const existing = loadDeployment(network.name);
  if (existing?.token?.address) {
    console.log(`\nA deployment already exists for ${network.name}: ${existing.token.address}`);
    console.log("Delete deployments/" + network.name + ".json if you really want to redeploy.");
    return;
  }

  console.log("\nDeploying LiXi...");
  const LiXi = await ethers.getContractFactory("LiXi");
  const token = await LiXi.deploy(treasury);
  const receipt = await token.deploymentTransaction().wait(chainId === 31337n ? 1 : 3);
  const address = await token.getAddress();

  const totalSupply = await token.totalSupply();
  const treasuryBalance = await token.balanceOf(treasury);

  console.log("LiXi address :", address);
  console.log("Tx hash         :", receipt.hash);
  console.log("Block           :", receipt.blockNumber);
  console.log("Total supply    :", ethers.formatUnits(totalSupply, 18), "LIXI");
  console.log("Treasury holds  :", ethers.formatUnits(treasuryBalance, 18), "LIXI");

  const file = saveDeployment(network.name, {
    network: network.name,
    chainId: Number(chainId),
    deployer: deployer.address,
    treasury,
    token: {
      contract: "LiXi",
      address,
      constructorArgs: [treasury],
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
    },
    vestingWallets: [],
    deployedAt: new Date().toISOString(),
  });
  console.log("\nSaved deployment record to", file);

  if (chainId === 56n || chainId === 97n) {
    console.log("\nNext step - verify source on BscScan:");
    console.log(`  npm run verify -- --network ${network.name}`);
    console.log("or manually:");
    console.log(`  npx hardhat verify --network ${network.name} ${address} ${treasury}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
