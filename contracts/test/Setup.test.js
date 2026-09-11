// Unit tests for scripts/new-wallet.js and scripts/check-setup.js. Only the
// pure / filesystem parts are covered: this test suite has no BNB Chain access,
// so collectState() against a real RPC is exercised manually with
// `npm run check -- --network bscTestnet`.
const { expect } = require("chai");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync, spawnSync } = require("child_process");
const { ethers } = require("hardhat");

const { generateWallet, writeEnv, readEnvValue, parseArgs: parseWalletArgs } = require("../scripts/new-wallet");
const check = require("../scripts/check-setup");

const SCRIPTS_DIR = path.join(__dirname, "..", "scripts");

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "lixi-setup-"));
}

describe("new-wallet script (scripts/new-wallet.js)", function () {
  it("generateWallet() returns a valid address, a 12-word mnemonic and a matching private key", function () {
    const w = generateWallet();
    expect(ethers.isAddress(w.address)).to.equal(true);
    expect(w.address).to.equal(ethers.getAddress(w.address)); // checksummed
    expect(w.mnemonic.split(" ")).to.have.lengthOf(12);
    expect(ethers.Mnemonic.isValidMnemonic(w.mnemonic)).to.equal(true);
    expect(w.privateKey).to.match(/^0x[0-9a-f]{64}$/);
    // The three pieces describe the same key.
    expect(new ethers.Wallet(w.privateKey).address).to.equal(w.address);
    expect(ethers.HDNodeWallet.fromPhrase(w.mnemonic).address).to.equal(w.address);
    // And two calls do not repeat.
    expect(generateWallet().address).to.not.equal(w.address);
  });

  it("writeEnv() creates .env from .env.example and fills PRIVATE_KEY", function () {
    const dir = tmpDir();
    const examplePath = path.join(dir, ".env.example");
    const envPath = path.join(dir, ".env");
    fs.writeFileSync(examplePath, "# comment\nPRIVATE_KEY=\nBSC_RPC_URL=https://example.invalid\nTREASURY_ADDRESS=\n");

    const { privateKey } = generateWallet();
    const res = writeEnv({ privateKey, envPath, examplePath });
    expect(res.created).to.equal(true);
    expect(res.envPath).to.equal(envPath);

    const text = fs.readFileSync(envPath, "utf8");
    expect(readEnvValue(text, "PRIVATE_KEY")).to.equal(privateKey);
    // Other lines are untouched.
    expect(readEnvValue(text, "BSC_RPC_URL")).to.equal("https://example.invalid");
    expect(readEnvValue(text, "TREASURY_ADDRESS")).to.equal("");
    expect(text).to.include("# comment");
    // Example file is not modified.
    expect(readEnvValue(fs.readFileSync(examplePath, "utf8"), "PRIVATE_KEY")).to.equal("");
  });

  it("writeEnv() appends PRIVATE_KEY when the line is absent and no example exists", function () {
    const dir = tmpDir();
    const envPath = path.join(dir, ".env");
    const examplePath = path.join(dir, "missing.example");
    fs.writeFileSync(envPath, "BSC_RPC_URL=https://example.invalid\n");
    const { privateKey } = generateWallet();
    writeEnv({ privateKey, envPath, examplePath });
    const text = fs.readFileSync(envPath, "utf8");
    expect(readEnvValue(text, "PRIVATE_KEY")).to.equal(privateKey);
    expect(readEnvValue(text, "BSC_RPC_URL")).to.equal("https://example.invalid");
  });

  it("writeEnv() refuses to overwrite an existing non-empty PRIVATE_KEY", function () {
    const dir = tmpDir();
    const envPath = path.join(dir, ".env");
    const examplePath = path.join(dir, ".env.example");
    fs.writeFileSync(examplePath, "PRIVATE_KEY=\n");
    const first = generateWallet();
    writeEnv({ privateKey: first.privateKey, envPath, examplePath });

    const second = generateWallet();
    expect(() => writeEnv({ privateKey: second.privateKey, envPath, examplePath })).to.throw(/đã có PRIVATE_KEY/);
    // The original key is intact.
    expect(readEnvValue(fs.readFileSync(envPath, "utf8"), "PRIVATE_KEY")).to.equal(first.privateKey);
  });

  it("writeEnv() rejects a malformed private key", function () {
    const dir = tmpDir();
    expect(() => writeEnv({ privateKey: "abc", envPath: path.join(dir, ".env") })).to.throw(/0x-prefixed/);
    expect(fs.existsSync(path.join(dir, ".env"))).to.equal(false);
  });

  it("parseArgs() understands --write-env and rejects unknown flags", function () {
    expect(parseWalletArgs([])).to.deep.equal({ writeEnv: false, help: false });
    expect(parseWalletArgs(["--write-env"])).to.deep.equal({ writeEnv: true, help: false });
    expect(() => parseWalletArgs(["--bogus"])).to.throw(/không hợp lệ/);
  });

  it("CLI prints address, mnemonic and private key and does not touch .env without --write-env", function () {
    const out = execFileSync(process.execPath, [path.join(SCRIPTS_DIR, "new-wallet.js")], { encoding: "utf8" });
    const address = out.match(/Địa chỉ \(address\)\s*:\s*(0x[0-9a-fA-F]{40})/)[1];
    const pk = out.match(/Khóa riêng \(private key\):\s*(0x[0-9a-f]{64})/)[1];
    const mnemonic = out.match(/mnemonic\):\n\n\s+([a-z ]+)\n/)[1].trim();
    expect(new ethers.Wallet(pk).address).to.equal(address);
    expect(ethers.HDNodeWallet.fromPhrase(mnemonic).address).to.equal(address);
    expect(out).to.include("VIẾT 12 TỪ TRÊN RA GIẤY");
    expect(out).to.include("KHÔNG BAO GIỜ chia sẻ");
    expect(out).to.include("KHÔNG commit file .env");
    expect(out).to.include("VÍ DEPLOY / VẬN HÀNH");
    expect(out).to.include("Chưa ghi gì vào .env");
  });
});

describe("check-setup script (scripts/check-setup.js)", function () {
  const ADDRESS = "0x1111111111111111111111111111111111111111";
  const TREASURY = "0x2222222222222222222222222222222222222222";

  function baseState(overrides = {}) {
    return {
      network: "bscTestnet",
      networkLabel: "BNB Chain testnet",
      expectedChainId: 97,
      deployCommand: "npm run deploy:testnet",
      envPath: "/tmp/x/.env",
      envFileExists: true,
      privateKey: { set: true, valid: true, address: ADDRESS },
      rpc: { host: "https://rpc.example", fromEnv: true, reachable: true, chainId: 97, error: null },
      balanceWei: ethers.parseEther("0.5"),
      treasury: { set: true, valid: true, address: TREASURY, isZero: false, isContract: true, error: null },
      bscscanApiKeySet: true,
      ...overrides,
    };
  }

  it("parseArgs() defaults to bscTestnet and validates --network", function () {
    expect(check.parseArgs([]).network).to.equal("bscTestnet");
    expect(check.parseArgs(["--network", "bsc"]).network).to.equal("bsc");
    expect(check.parseArgs(["--network=bsc"]).network).to.equal("bsc");
    expect(() => check.parseArgs(["--network", "ethereum"])).to.throw(/--network phải là/);
    expect(() => check.parseArgs(["--nope"])).to.throw(/không hợp lệ/);
  });

  it("maskUrl() hides paths and query strings (API keys)", function () {
    expect(check.maskUrl("https://bsc-mainnet.nodereal.io/v1/SECRETKEY?x=1")).to.equal("https://bsc-mainnet.nodereal.io");
    expect(check.maskUrl("https://data-seed-prebsc-1-s1.bnbchain.org:8545")).to.equal(
      "https://data-seed-prebsc-1-s1.bnbchain.org:8545"
    );
    expect(check.maskUrl("not a url")).to.equal("(URL không hợp lệ)");
  });

  it("normalizePrivateKey() adds the 0x prefix and treats blanks as unset", function () {
    expect(check.normalizePrivateKey("")).to.equal(null);
    expect(check.normalizePrivateKey("  ")).to.equal(null);
    expect(check.normalizePrivateKey("ab")).to.equal("0xab");
    expect(check.normalizePrivateKey(" 0xab ")).to.equal("0xab");
  });

  it("summarize() reports READY when everything is in place", function () {
    const r = check.summarize(baseState());
    expect(r.ready).to.equal(true);
    expect(r.rpcFailed).to.equal(false);
    expect(r.missing).to.deep.equal([]);
    const text = r.lines.join("\n");
    expect(text).to.include("SẴN SÀNG");
    expect(text).to.include(ADDRESS);
    expect(text).to.include("chainId 97");
    expect(text).to.include("0.5 BNB");
    expect(text).to.include("HỢP ĐỒNG");
  });

  it("summarize() lists every missing item when .env is empty", function () {
    const r = check.summarize(
      baseState({
        envFileExists: false,
        privateKey: { set: false, valid: false, address: null },
        balanceWei: null,
        treasury: { set: false, valid: false, address: null, isZero: false, isContract: null, error: null },
        bscscanApiKeySet: false,
      })
    );
    expect(r.ready).to.equal(false);
    const missing = r.missing.join("\n");
    expect(missing).to.include("wallet:new");
    expect(missing).to.include("TREASURY_ADDRESS");
    expect(missing).to.include("Tạo file .env");
    expect(r.warnings.join("\n")).to.include("BSCSCAN_API_KEY");
    expect(r.lines.join("\n")).to.include("CHƯA SẴN SÀNG");
  });

  it("summarize() flags an unreachable RPC and never prints a private key", function () {
    const r = check.summarize(
      baseState({
        rpc: { host: "https://rpc.example", fromEnv: false, reachable: false, chainId: null, error: "ECONNREFUSED" },
        balanceWei: null,
        treasury: { set: true, valid: true, address: TREASURY, isZero: false, isContract: null, error: null },
      })
    );
    expect(r.ready).to.equal(false);
    expect(r.rpcFailed).to.equal(true);
    const text = r.lines.join("\n");
    expect(text).to.include("Không kết nối được RPC https://rpc.example");
    expect(text).to.include("ECONNREFUSED");
    expect(text).to.match(/chưa kiểm tra được là hợp đồng hay EOA/);
    expect(text).to.not.match(/0x[0-9a-fA-F]{64}/);
  });

  it("summarize() detects a wrong chainId, a zero balance and points to the faucet", function () {
    const r = check.summarize(
      baseState({ rpc: { host: "h", fromEnv: true, reachable: true, chainId: 56, error: null }, balanceWei: 0n })
    );
    expect(r.ready).to.equal(false);
    expect(r.missing.join("\n")).to.include("chainId 97");
    expect(r.missing.join("\n")).to.include(check.FAUCET_URL);
  });

  it("summarize() treats an EOA treasury as a warning on testnet but blocking on mainnet", function () {
    const eoa = { set: true, valid: true, address: TREASURY, isZero: false, isContract: false, error: null };
    const testnet = check.summarize(baseState({ treasury: eoa }));
    expect(testnet.ready).to.equal(true);
    expect(testnet.warnings.join("\n")).to.include("EOA");

    const mainnet = check.summarize(
      baseState({
        network: "bsc",
        networkLabel: "BNB Chain mainnet",
        expectedChainId: 56,
        deployCommand: "npm run deploy:mainnet",
        rpc: { host: "h", fromEnv: true, reachable: true, chainId: 56, error: null },
        treasury: eoa,
      })
    );
    expect(mainnet.ready).to.equal(false);
    expect(mainnet.missing.join("\n")).to.include("multisig");
  });

  it("summarize() rejects the zero address and an invalid private key", function () {
    const zero = check.summarize(
      baseState({ treasury: { set: true, valid: true, address: ethers.ZeroAddress, isZero: true, isContract: null, error: null } })
    );
    expect(zero.ready).to.equal(false);
    expect(zero.missing.join("\n")).to.include("0x000");

    const badKey = check.summarize(baseState({ privateKey: { set: true, valid: false, address: null }, balanceWei: null }));
    expect(badKey.ready).to.equal(false);
    expect(badKey.missing.join("\n")).to.include("Sửa PRIVATE_KEY");
  });

  it("CLI exits non-zero with a clear message when the RPC is unreachable", function () {
    this.timeout(60_000);
    const dir = tmpDir();
    const envPath = path.join(dir, ".env");
    const { privateKey } = generateWallet();
    fs.writeFileSync(
      envPath,
      `PRIVATE_KEY=${privateKey}\nBSC_TESTNET_RPC_URL=http://127.0.0.1:9\nTREASURY_ADDRESS=${TREASURY}\n`
    );
    const res = spawnSync(process.execPath, [path.join(SCRIPTS_DIR, "check-setup.js"), "--env", envPath], {
      encoding: "utf8",
      timeout: 50_000,
    });
    expect(res.status).to.equal(1);
    const out = res.stdout + res.stderr;
    expect(out).to.include("Không kết nối được RPC http://127.0.0.1:9");
    expect(out).to.include("LỖI: không kết nối được RPC");
    expect(out).to.include(new ethers.Wallet(privateKey).address); // derived address is shown
    expect(out).to.not.include(privateKey.slice(2)); // the key itself never is
  });
});
