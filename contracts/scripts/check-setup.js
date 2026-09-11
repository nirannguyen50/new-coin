#!/usr/bin/env node
// Checks that contracts/.env and the network are ready for `npm run deploy:testnet`
// (or deploy:mainnet). Never prints secrets: the private key is only used to derive
// the address, RPC URLs are shown as host names only. Usage:
//   npm run check                          # bscTestnet (chainId 97)
//   npm run check -- --network bsc         # mainnet (chainId 56)
// Exit code 0 = ready; 1 = something is missing or the RPC is unreachable.
//
// Network access is isolated in collectState(); summarize(state) is pure and
// unit-tested in test/Setup.test.js.
const fs = require("fs");
const path = require("path");
const ethers = require("ethers");

const CONTRACTS_DIR = path.join(__dirname, "..");
const DEFAULT_ENV_PATH = path.join(CONTRACTS_DIR, ".env");

// Mirrors the `networks` section of hardhat.config.js.
const NETWORKS = {
  bscTestnet: {
    chainId: 97,
    rpcEnvVar: "BSC_TESTNET_RPC_URL",
    defaultRpc: "https://data-seed-prebsc-1-s1.bnbchain.org:8545",
    label: "BNB Chain testnet",
    deployCommand: "npm run deploy:testnet",
  },
  bsc: {
    chainId: 56,
    rpcEnvVar: "BSC_RPC_URL",
    defaultRpc: "https://bsc-dataseed.bnbchain.org",
    label: "BNB Chain mainnet",
    deployCommand: "npm run deploy:mainnet",
  },
};

const FAUCET_URL = "https://www.bnbchain.org/en/testnet-faucet";
// Below this the token deploy (~1.3M gas at 10 gwei ≈ 0.013 BNB) plus a few
// vesting wallets may not fit; it is a warning, not a hard failure.
const RECOMMENDED_MIN_BALANCE_WEI = ethers.parseEther("0.05");
const RPC_TIMEOUT_MS = 15_000;

function parseArgs(argv) {
  const args = { network: "bscTestnet", envPath: DEFAULT_ENV_PATH, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--network") {
      args.network = argv[++i];
    } else if (a.startsWith("--network=")) {
      args.network = a.slice("--network=".length);
    } else if (a === "--env") {
      args.envPath = path.resolve(argv[++i]);
    } else if (a === "--help" || a === "-h") {
      args.help = true;
    } else {
      throw new Error(`Tham số không hợp lệ: ${a}`);
    }
  }
  if (!NETWORKS[args.network]) {
    throw new Error(`--network phải là một trong: ${Object.keys(NETWORKS).join(", ")} (nhận "${args.network}")`);
  }
  return args;
}

/** Returns "https://host[:port]" so that API keys embedded in the path/query never show. */
function maskUrl(url) {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}`;
  } catch {
    return "(URL không hợp lệ)";
  }
}

/** Loads KEY=value pairs from a .env file into a plain object (does not touch process.env). */
function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return { exists: false, values: {} };
  const { parse } = require("dotenv");
  return { exists: true, values: parse(fs.readFileSync(envPath, "utf8")) };
}

function normalizePrivateKey(raw) {
  const s = String(raw || "").trim();
  if (!s) return null;
  return s.startsWith("0x") ? s : `0x${s}`;
}

function withTimeout(promise, ms, what) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${what}: quá ${ms / 1000}s không phản hồi`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Gathers everything summarize() needs. Only this function talks to the network.
 * All failures are recorded in the state rather than thrown, so the checklist
 * can still be printed.
 */
async function collectState({ network, envPath }) {
  const net = NETWORKS[network];
  const env = loadEnvFile(envPath);
  const v = env.values;

  const state = {
    network,
    networkLabel: net.label,
    expectedChainId: net.chainId,
    deployCommand: net.deployCommand,
    envPath,
    envFileExists: env.exists,
    privateKey: { set: false, valid: false, address: null },
    rpc: { host: null, fromEnv: false, reachable: null, chainId: null, error: null },
    balanceWei: null,
    treasury: { set: false, valid: false, address: null, isZero: false, isContract: null, error: null },
    bscscanApiKeySet: Boolean((v.BSCSCAN_API_KEY || "").trim()),
  };

  // --- Private key (never printed) -------------------------------------------
  const pk = normalizePrivateKey(v.PRIVATE_KEY);
  if (pk) {
    state.privateKey.set = true;
    try {
      state.privateKey.address = new ethers.Wallet(pk).address;
      state.privateKey.valid = true;
    } catch {
      state.privateKey.valid = false;
    }
  }

  // --- Treasury -----------------------------------------------------------------
  const treasury = (v.TREASURY_ADDRESS || "").trim();
  if (treasury) {
    state.treasury.set = true;
    state.treasury.valid = ethers.isAddress(treasury);
    if (state.treasury.valid) {
      state.treasury.address = ethers.getAddress(treasury);
      state.treasury.isZero = state.treasury.address === ethers.ZeroAddress;
    }
  }

  // --- RPC ----------------------------------------------------------------------
  const rpcUrl = (v[net.rpcEnvVar] || "").trim() || net.defaultRpc;
  state.rpc.fromEnv = Boolean((v[net.rpcEnvVar] || "").trim());
  state.rpc.host = maskUrl(rpcUrl);

  let provider = null;
  try {
    const req = new ethers.FetchRequest(rpcUrl);
    req.timeout = RPC_TIMEOUT_MS;
    // staticNetwork stops ethers from retrying network detection forever when
    // the endpoint is down; the real chainId is read with a raw eth_chainId below.
    provider = new ethers.JsonRpcProvider(req, undefined, {
      staticNetwork: ethers.Network.from(net.chainId),
      batchMaxCount: 1,
    });
    const chainIdHex = await withTimeout(provider.send("eth_chainId", []), RPC_TIMEOUT_MS, "eth_chainId");
    state.rpc.chainId = Number(BigInt(chainIdHex));
    state.rpc.reachable = true;
  } catch (err) {
    state.rpc.reachable = false;
    state.rpc.error = firstLine(err);
  }

  if (state.rpc.reachable && state.rpc.chainId === net.chainId) {
    if (state.privateKey.valid) {
      try {
        const hex = await withTimeout(
          provider.send("eth_getBalance", [state.privateKey.address, "latest"]),
          RPC_TIMEOUT_MS,
          "eth_getBalance"
        );
        state.balanceWei = BigInt(hex);
      } catch (err) {
        state.rpc.error = firstLine(err);
      }
    }
    if (state.treasury.valid && !state.treasury.isZero) {
      try {
        const code = await withTimeout(
          provider.send("eth_getCode", [state.treasury.address, "latest"]),
          RPC_TIMEOUT_MS,
          "eth_getCode"
        );
        state.treasury.isContract = code !== "0x" && code !== "0x0" && code !== "";
      } catch (err) {
        state.treasury.error = firstLine(err);
      }
    }
  }

  if (provider) provider.destroy();
  return state;
}

function firstLine(err) {
  const msg = String((err && err.shortMessage) || (err && err.message) || err);
  return msg.split("\n")[0].slice(0, 200);
}

function fmtBnb(wei) {
  const s = ethers.formatEther(wei);
  return s.includes(".") ? s.replace(/0+$/, "").replace(/\.$/, "") : s;
}

/**
 * Pure: turns a state object (see collectState) into a report.
 * @returns {{ ready: boolean, rpcFailed: boolean, lines: string[], missing: string[], warnings: string[] }}
 */
function summarize(state) {
  const lines = [];
  const missing = [];
  const warnings = [];
  const ok = (s) => lines.push(`  [OK]   ${s}`);
  const bad = (s) => lines.push(`  [!!]   ${s}`);
  const warn = (s) => lines.push(`  [??]   ${s}`);
  const info = (s) => lines.push(`  [..]   ${s}`);

  lines.push(`Mạng          : ${state.network} (${state.networkLabel}, chainId ${state.expectedChainId})`);
  lines.push(`File .env     : ${state.envPath}${state.envFileExists ? "" : "  (CHƯA CÓ)"}`);
  lines.push("");

  // .env
  if (!state.envFileExists) {
    bad("Chưa có file .env");
    missing.push("Tạo file .env: `cp .env.example .env` hoặc `npm run wallet:new -- --write-env`");
  }

  // PRIVATE_KEY
  if (!state.privateKey.set) {
    bad("PRIVATE_KEY chưa đặt");
    missing.push("Tạo ví deploy: `npm run wallet:new -- --write-env` (hoặc dán khóa riêng của ví có sẵn vào PRIVATE_KEY=)");
  } else if (!state.privateKey.valid) {
    bad("PRIVATE_KEY có giá trị nhưng KHÔNG hợp lệ (cần 64 ký tự hex, có hoặc không có 0x)");
    missing.push("Sửa PRIVATE_KEY trong .env (giá trị hiện tại không phải khóa riêng hợp lệ)");
  } else {
    ok(`PRIVATE_KEY hợp lệ -> địa chỉ ví deploy: ${state.privateKey.address}`);
  }

  // RPC
  const rpcNote = state.rpc.fromEnv ? "" : " (mặc định, endpoint công khai)";
  if (state.rpc.reachable === false) {
    bad(`Không kết nối được RPC ${state.rpc.host}${rpcNote}: ${state.rpc.error || "lỗi không rõ"}`);
    missing.push(
      `Kiểm tra mạng / đặt ${state.network === "bsc" ? "BSC_RPC_URL" : "BSC_TESTNET_RPC_URL"} sang RPC khác ` +
        "(NodeReal, QuickNode, Ankr, PublicNode...) rồi chạy lại `npm run check`"
    );
  } else if (state.rpc.reachable === true) {
    if (state.rpc.chainId === state.expectedChainId) {
      ok(`RPC ${state.rpc.host}${rpcNote} phản hồi, chainId ${state.rpc.chainId}`);
    } else {
      bad(`RPC ${state.rpc.host} trả về chainId ${state.rpc.chainId}, mong đợi ${state.expectedChainId}`);
      missing.push(`RPC đang trỏ sai mạng: sửa URL RPC cho ${state.networkLabel} (chainId ${state.expectedChainId})`);
    }
  } else {
    info("RPC chưa được kiểm tra");
  }

  // Balance
  if (state.balanceWei !== null && state.balanceWei !== undefined) {
    const bal = fmtBnb(state.balanceWei);
    if (state.balanceWei === 0n) {
      bad(`Số dư ví deploy: 0 BNB`);
      missing.push(
        state.network === "bsc"
          ? "Nạp BNB (thật) vào ví deploy để trả gas, chỉ nạp đủ dùng"
          : `Nạp BNB testnet vào ví deploy từ faucet chính thức: ${FAUCET_URL} ` +
              "(có thể yêu cầu ví có một ít BNB mainnet hoặc xác minh mạng xã hội; faucet thay đổi thường xuyên)"
      );
    } else if (state.balanceWei < RECOMMENDED_MIN_BALANCE_WEI) {
      warn(`Số dư ví deploy: ${bal} BNB (thấp; nên có >= ${fmtBnb(RECOMMENDED_MIN_BALANCE_WEI)} BNB cho token + ví vesting)`);
      warnings.push(`Số dư BNB thấp (${bal}); token deploy tốn ~0,01-0,02 BNB, mỗi ví vesting thêm ~0,01 BNB`);
    } else {
      ok(`Số dư ví deploy: ${bal} BNB`);
    }
  } else if (state.privateKey.valid && state.rpc.reachable && state.rpc.chainId === state.expectedChainId) {
    warn(`Không đọc được số dư ví deploy${state.rpc.error ? `: ${state.rpc.error}` : ""}`);
    warnings.push("Không đọc được số dư BNB; chạy lại `npm run check`");
  }

  // Treasury
  if (!state.treasury.set) {
    bad("TREASURY_ADDRESS chưa đặt (ví nhận toàn bộ 1.000.000.000 LIXI khi deploy)");
    missing.push(
      "Điền TREASURY_ADDRESS trong .env" +
        (state.network === "bsc" ? " (mainnet: BẮT BUỘC là multisig, ví dụ Safe 3/5)" : " (testnet: có thể tạm dùng chính ví deploy hoặc một Safe testnet)")
    );
  } else if (!state.treasury.valid) {
    bad("TREASURY_ADDRESS không phải địa chỉ hợp lệ");
    missing.push("Sửa TREASURY_ADDRESS trong .env (địa chỉ 0x... 40 ký tự hex, checksum đúng)");
  } else if (state.treasury.isZero) {
    bad("TREASURY_ADDRESS là địa chỉ 0x0 - hợp đồng sẽ từ chối deploy");
    missing.push("Đặt TREASURY_ADDRESS khác 0x000...000");
  } else {
    const same =
      state.privateKey.address && state.privateKey.address.toLowerCase() === state.treasury.address.toLowerCase();
    if (state.treasury.isContract === true) {
      ok(`TREASURY_ADDRESS ${state.treasury.address} là HỢP ĐỒNG (nhiều khả năng là Safe/multisig)`);
    } else if (state.treasury.isContract === false) {
      if (state.network === "bsc") {
        bad(`TREASURY_ADDRESS ${state.treasury.address} là ví thường (EOA), KHÔNG phải multisig`);
        missing.push("Mainnet: TREASURY_ADDRESS phải là multisig (Safe). Tạo Safe tại https://app.safe.global rồi dùng địa chỉ Safe");
      } else {
        warn(`TREASURY_ADDRESS ${state.treasury.address} là ví thường (EOA)${same ? " - chính là ví deploy" : ""}; chấp nhận được trên testnet, mainnet phải là multisig`);
        warnings.push("Treasury trên testnet là EOA; trước mainnet phải đổi sang Safe multisig");
      }
    } else {
      info(`TREASURY_ADDRESS ${state.treasury.address} hợp lệ (chưa kiểm tra được là hợp đồng hay EOA${state.treasury.error ? `: ${state.treasury.error}` : ""})`);
    }
  }

  // BscScan key (optional for deploy, needed for verify)
  if (state.bscscanApiKeySet) ok("BSCSCAN_API_KEY đã đặt (dùng cho `npm run verify`)");
  else {
    warn("BSCSCAN_API_KEY chưa đặt - deploy vẫn được, nhưng `npm run verify` sẽ cần (tạo tại https://etherscan.io/apidashboard)");
    warnings.push("Thiếu BSCSCAN_API_KEY (chỉ cần khi verify mã nguồn)");
  }

  const rpcFailed = state.rpc.reachable === false;
  const ready = missing.length === 0 && !rpcFailed;

  lines.push("");
  if (ready) {
    lines.push(`SẴN SÀNG: có thể chạy \`${state.deployCommand}\`.`);
    if (warnings.length) {
      lines.push("Lưu ý:");
      for (const w of warnings) lines.push(`  - ${w}`);
    }
  } else {
    lines.push(`CHƯA SẴN SÀNG cho \`${state.deployCommand}\`. Còn thiếu:`);
    for (const [i, m] of missing.entries()) lines.push(`  ${i + 1}. ${m}`);
    if (warnings.length) {
      lines.push("Lưu ý thêm:");
      for (const w of warnings) lines.push(`  - ${w}`);
    }
  }

  return { ready, rpcFailed, lines, missing, warnings };
}

async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    console.log("Dùng: npm run check [-- --network bscTestnet|bsc] [--env đường/dẫn/.env]");
    return 0;
  }
  console.log(`Đang kiểm tra cấu hình LiXi cho ${args.network}...\n`);
  const state = await collectState(args);
  const report = summarize(state);
  for (const line of report.lines) console.log(line);
  if (report.rpcFailed) {
    console.error(`\nLỖI: không kết nối được RPC của ${state.networkLabel}. Không thể kiểm tra số dư và treasury.`);
  }
  return report.ready ? 0 : 1;
}

if (require.main === module) {
  main()
    .then((code) => {
      process.exitCode = code;
    })
    .catch((err) => {
      console.error(err.message || err);
      process.exitCode = 1;
    });
}

module.exports = {
  NETWORKS,
  FAUCET_URL,
  RECOMMENDED_MIN_BALANCE_WEI,
  parseArgs,
  maskUrl,
  loadEnvFile,
  normalizePrivateKey,
  collectState,
  summarize,
  main,
};
