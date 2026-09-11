require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({ quiet: true });
const path = require("path");
const { subtask } = require("hardhat/config");
const { TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD } = require("hardhat/builtin-tasks/task-names");

const SOLC_VERSION = "0.8.28";

// Compile with the exact `solc` (solc-js) package pinned in package.json instead
// of downloading a binary from binaries.soliditylang.org at build time. This
// makes builds reproducible and works in offline/CI/firewalled environments.
// The emitted long version ("0.8.28+commit.7893614a") matches the native build,
// so BscScan verification is unaffected. Set USE_NATIVE_SOLC=true to fall back
// to Hardhat's default downloader.
subtask(TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD, async (args, hre, runSuper) => {
  if (process.env.USE_NATIVE_SOLC === "true" || args.solcVersion !== SOLC_VERSION) {
    return runSuper(args);
  }
  const solcPkg = require("solc/package.json");
  if (solcPkg.version !== SOLC_VERSION) {
    throw new Error(`Installed solc package is ${solcPkg.version}, expected ${SOLC_VERSION}. Run npm install.`);
  }
  const compilerPath = path.join(path.dirname(require.resolve("solc/package.json")), "soljson.js");
  const longVersion = require("solc").version().replace(/\.Emscripten\.clang$/, "");
  return { compilerPath, isSolcJs: true, version: SOLC_VERSION, longVersion };
});

const {
  PRIVATE_KEY,
  BSC_RPC_URL,
  BSC_TESTNET_RPC_URL,
  BSCSCAN_API_KEY,
  REPORT_GAS,
} = process.env;

// Only attach a signer when a key is configured so that `npm test` and
// `npm run compile` work without any .env file.
const accounts = PRIVATE_KEY ? [PRIVATE_KEY] : [];

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: SOLC_VERSION,
    settings: {
      optimizer: { enabled: true, runs: 200 },
      // OpenZeppelin Contracts v5.7 uses the MCOPY opcode, which requires the
      // Cancun EVM. BNB Chain (mainnet and testnet) has supported Cancun
      // opcodes since its 2024 hardforks.
      evmVersion: "cancun",
    },
  },
  networks: {
    hardhat: {
      // Fixed chainId keeps the EIP-712 permit tests deterministic.
      chainId: 31337,
    },
    bscTestnet: {
      url: BSC_TESTNET_RPC_URL || "https://data-seed-prebsc-1-s1.bnbchain.org:8545",
      chainId: 97,
      accounts,
    },
    bsc: {
      url: BSC_RPC_URL || "https://bsc-dataseed.bnbchain.org",
      chainId: 56,
      accounts,
    },
  },
  etherscan: {
    // Etherscan API v2: one key works for BscScan (chainId 56 / 97).
    apiKey: BSCSCAN_API_KEY || "",
  },
  sourcify: {
    enabled: false,
  },
  gasReporter: {
    enabled: REPORT_GAS === "true",
    currency: "USD",
  },
  mocha: {
    timeout: 60000,
  },
};
