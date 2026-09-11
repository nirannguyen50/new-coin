#!/usr/bin/env node
// Generates a fresh random wallet LOCALLY (nothing leaves this machine) for use
// as the LiXi deployer/operator wallet. Usage:
//   npm run wallet:new                  # print address, mnemonic and private key
//   npm run wallet:new -- --write-env   # ...and also write PRIVATE_KEY= into contracts/.env
//
// The secrets are printed to the terminal only. Nothing is logged to a file
// except (with --write-env) the private key into .env, which is git-ignored.
// An existing non-empty PRIVATE_KEY in .env is never overwritten.
//
// generateWallet() and writeEnv() are pure-ish and exported for unit tests.
const fs = require("fs");
const path = require("path");
const { Wallet } = require("ethers");

const CONTRACTS_DIR = path.join(__dirname, "..");
const DEFAULT_ENV_PATH = path.join(CONTRACTS_DIR, ".env");
const DEFAULT_EXAMPLE_PATH = path.join(CONTRACTS_DIR, ".env.example");

/**
 * Creates a random wallet with ethers (BIP-39 mnemonic, 12 words, path m/44'/60'/0'/0/0).
 * @returns {{ address: string, mnemonic: string, privateKey: string, path: string }}
 */
function generateWallet() {
  const wallet = Wallet.createRandom();
  return {
    address: wallet.address,
    mnemonic: wallet.mnemonic.phrase,
    privateKey: wallet.privateKey,
    path: wallet.path,
  };
}

/**
 * Returns the value of `KEY=` in dotenv-style text, or null when the key is absent.
 * Only the simple `KEY=value` form is handled (which is what .env.example uses).
 */
function readEnvValue(text, key) {
  const re = new RegExp(`^\\s*${key}\\s*=(.*)$`, "m");
  const m = text.match(re);
  if (!m) return null;
  return m[1].trim().replace(/^["']|["']$/g, "");
}

/**
 * Writes PRIVATE_KEY into a .env file.
 *  - Creates the file from `examplePath` when it does not exist (or an empty file
 *    with just the key when the example is missing too).
 *  - Refuses (throws) when the file already contains a non-empty PRIVATE_KEY.
 *  - Never touches any other line.
 *
 * @param {object} opts
 * @param {string} opts.privateKey      0x-prefixed hex private key
 * @param {string} [opts.envPath]       default contracts/.env
 * @param {string} [opts.examplePath]   default contracts/.env.example
 * @returns {{ envPath: string, created: boolean }}
 */
function writeEnv({ privateKey, envPath = DEFAULT_ENV_PATH, examplePath = DEFAULT_EXAMPLE_PATH }) {
  if (!/^0x[0-9a-fA-F]{64}$/.test(privateKey || "")) {
    throw new Error("privateKey must be a 0x-prefixed 32-byte hex string");
  }

  let created = false;
  let text;
  if (fs.existsSync(envPath)) {
    text = fs.readFileSync(envPath, "utf8");
  } else if (fs.existsSync(examplePath)) {
    text = fs.readFileSync(examplePath, "utf8");
    created = true;
  } else {
    text = "";
    created = true;
  }

  const existing = readEnvValue(text, "PRIVATE_KEY");
  if (existing) {
    throw new Error(
      `${envPath} đã có PRIVATE_KEY (không rỗng). Không ghi đè để tránh mất ví cũ. ` +
        "Nếu thật sự muốn thay ví, hãy xóa dòng PRIVATE_KEY= trong .env thủ công rồi chạy lại."
    );
  }

  if (existing === null) {
    // Key line absent: append.
    text = text.replace(/\s*$/, "") + (text.trim() ? "\n" : "") + `PRIVATE_KEY=${privateKey}\n`;
  } else {
    // Key line present but empty: fill it in place (first occurrence only).
    text = text.replace(/^(\s*PRIVATE_KEY\s*=).*$/m, `$1${privateKey}`);
  }

  fs.mkdirSync(path.dirname(envPath), { recursive: true });
  fs.writeFileSync(envPath, text, { mode: 0o600 });
  try {
    fs.chmodSync(envPath, 0o600);
  } catch {
    // Best effort (e.g. on filesystems without POSIX permissions).
  }
  return { envPath, created };
}

function parseArgs(argv) {
  const args = { writeEnv: false, help: false };
  for (const a of argv) {
    if (a === "--write-env") args.writeEnv = true;
    else if (a === "--help" || a === "-h") args.help = true;
    else throw new Error(`Tham số không hợp lệ: ${a}`);
  }
  return args;
}

function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    console.log("Dùng: npm run wallet:new [-- --write-env]");
    console.log("  --write-env   ghi PRIVATE_KEY vào contracts/.env (tạo từ .env.example nếu chưa có)");
    return 0;
  }

  const w = generateWallet();
  const bar = "=".repeat(78);

  console.log(bar);
  console.log("  VÍ MỚI CHO LIXI (tạo ngẫu nhiên trên máy này, không gửi đi đâu)");
  console.log(bar);
  console.log(`Địa chỉ (address)      : ${w.address}`);
  console.log(`Đường dẫn (HD path)    : ${w.path}`);
  console.log("");
  console.log("Cụm từ khôi phục (12 từ, mnemonic):");
  console.log("");
  console.log(`    ${w.mnemonic}`);
  console.log("");
  console.log(`Khóa riêng (private key): ${w.privateKey}`);
  console.log(bar);
  console.log("CẢNH BÁO - ĐỌC KỸ:");
  console.log("  1. VIẾT 12 TỪ TRÊN RA GIẤY ngay bây giờ và cất ở nơi an toàn. Ai có 12 từ này");
  console.log("     (hoặc khóa riêng) là có toàn quyền với ví. Mất 12 từ = mất ví, không ai khôi phục được.");
  console.log("  2. KHÔNG BAO GIỜ chia sẻ mnemonic/khóa riêng: không chụp màn hình, không gửi qua chat,");
  console.log("     email, Telegram, không dán vào website/bot nào. Không ai 'hỗ trợ' hợp pháp nào hỏi nó.");
  console.log("  3. KHÔNG commit file .env lên git (đã có trong .gitignore). Không đưa vào CI log.");
  console.log("  4. Đây là VÍ DEPLOY / VẬN HÀNH (deployer/operator): chỉ nạp đủ BNB trả gas và đúng số");
  console.log("     token cần dùng cho từng bước. Treasury và LP token phải nằm ở ví multisig, không ở đây.");
  console.log("  5. Xóa lịch sử terminal nếu máy dùng chung (ví dụ: history -c).");
  console.log(bar);

  if (args.writeEnv) {
    try {
      const { envPath, created } = writeEnv({ privateKey: w.privateKey });
      console.log(created ? `Đã tạo ${envPath} từ .env.example và ghi PRIVATE_KEY.` : `Đã ghi PRIVATE_KEY vào ${envPath}.`);
      console.log("Bước tiếp theo: npm run check -- --network bscTestnet");
    } catch (err) {
      console.error(`\nKHÔNG ghi được .env: ${err.message}`);
      console.error("Ví ở trên vẫn hợp lệ; bạn có thể tự dán khóa riêng vào PRIVATE_KEY= trong .env.");
      return 1;
    }
  } else {
    console.log("Chưa ghi gì vào .env. Chạy lại với `npm run wallet:new -- --write-env` để tự ghi PRIVATE_KEY,");
    console.log("hoặc tự dán khóa riêng vào dòng PRIVATE_KEY= trong contracts/.env.");
  }
  return 0;
}

if (require.main === module) {
  try {
    process.exitCode = main();
  } catch (err) {
    console.error(err.message || err);
    process.exitCode = 1;
  }
}

module.exports = { generateWallet, writeEnv, readEnvValue, parseArgs, main };
