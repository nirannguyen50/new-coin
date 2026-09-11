const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

const DECIMALS = 18n;
const TOTAL_SUPPLY = 1_000_000_000n * 10n ** DECIMALS;

describe("NewCoin", function () {
  async function deployFixture() {
    const [deployer, treasury, alice, bob] = await ethers.getSigners();
    const NewCoin = await ethers.getContractFactory("NewCoin");
    const token = await NewCoin.deploy(treasury.address);
    await token.waitForDeployment();
    return { token, deployer, treasury, alice, bob };
  }

  describe("deployment", function () {
    it("has the expected name, symbol and 18 decimals", async function () {
      const { token } = await loadFixture(deployFixture);
      expect(await token.name()).to.equal("NewCoin");
      expect(await token.symbol()).to.equal("NEWC");
      expect(await token.decimals()).to.equal(DECIMALS);
    });

    it("mints the full fixed supply of 1,000,000,000 NEWC to the treasury", async function () {
      const { token, treasury, deployer } = await loadFixture(deployFixture);
      expect(await token.totalSupply()).to.equal(TOTAL_SUPPLY);
      expect(await token.balanceOf(treasury.address)).to.equal(TOTAL_SUPPLY);
      expect(await token.balanceOf(deployer.address)).to.equal(0n);
      expect(await token.TOTAL_SUPPLY_WHOLE()).to.equal(1_000_000_000n);
    });

    it("rejects the zero address as treasury", async function () {
      const NewCoin = await ethers.getContractFactory("NewCoin");
      await expect(NewCoin.deploy(ethers.ZeroAddress)).to.be.revertedWithCustomError(
        NewCoin,
        "TreasuryIsZeroAddress"
      );
    });
  });

  describe("immutability guarantees", function () {
    it("exposes no mint function and no way to increase supply", async function () {
      const { token } = await loadFixture(deployFixture);
      const names = token.interface.fragments.filter((f) => f.type === "function").map((f) => f.name);
      expect(names).to.not.include("mint");
      expect(names.filter((n) => /mint/i.test(n))).to.deep.equal([]);
    });

    it("has no owner, admin, pause, blacklist or fee functions in its ABI", async function () {
      const { token } = await loadFixture(deployFixture);
      const names = token.interface.fragments.filter((f) => f.type === "function").map((f) => f.name);
      const forbidden = /owner|admin|role|pause|unpause|blacklist|blocklist|whitelist|fee|tax|upgrade|setMax|setLimit|rescue|freeze/i;
      expect(names.filter((n) => forbidden.test(n))).to.deep.equal([]);
    });

    it("transfers exactly the requested amount (no transfer tax)", async function () {
      const { token, treasury, alice, bob } = await loadFixture(deployFixture);
      const amount = ethers.parseUnits("12345.678", 18);
      await token.connect(treasury).transfer(alice.address, amount);
      expect(await token.balanceOf(alice.address)).to.equal(amount);

      await token.connect(alice).transfer(bob.address, amount);
      expect(await token.balanceOf(bob.address)).to.equal(amount);
      expect(await token.balanceOf(alice.address)).to.equal(0n);
      expect(await token.totalSupply()).to.equal(TOTAL_SUPPLY);
    });
  });

  describe("burn", function () {
    it("lets a holder burn their own tokens and reduces total supply", async function () {
      const { token, treasury } = await loadFixture(deployFixture);
      const amount = ethers.parseUnits("1000", 18);
      await expect(token.connect(treasury).burn(amount))
        .to.emit(token, "Transfer")
        .withArgs(treasury.address, ethers.ZeroAddress, amount);
      expect(await token.totalSupply()).to.equal(TOTAL_SUPPLY - amount);
      expect(await token.balanceOf(treasury.address)).to.equal(TOTAL_SUPPLY - amount);
    });

    it("burnFrom respects allowance", async function () {
      const { token, treasury, alice } = await loadFixture(deployFixture);
      const amount = ethers.parseUnits("500", 18);
      await expect(token.connect(alice).burnFrom(treasury.address, amount)).to.be.revertedWithCustomError(
        token,
        "ERC20InsufficientAllowance"
      );
      await token.connect(treasury).approve(alice.address, amount);
      await token.connect(alice).burnFrom(treasury.address, amount);
      expect(await token.totalSupply()).to.equal(TOTAL_SUPPLY - amount);
      expect(await token.allowance(treasury.address, alice.address)).to.equal(0n);
    });

    it("cannot burn more than the balance", async function () {
      const { token, alice } = await loadFixture(deployFixture);
      await expect(token.connect(alice).burn(1n)).to.be.revertedWithCustomError(token, "ERC20InsufficientBalance");
    });
  });

  describe("permit (EIP-2612)", function () {
    async function signPermit(token, owner, spender, value, deadline, nonce) {
      const { chainId } = await ethers.provider.getNetwork();
      const domain = {
        name: "NewCoin",
        version: "1",
        chainId,
        verifyingContract: await token.getAddress(),
      };
      const types = {
        Permit: [
          { name: "owner", type: "address" },
          { name: "spender", type: "address" },
          { name: "value", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" },
        ],
      };
      const message = { owner: owner.address, spender, value, nonce, deadline };
      const signature = await owner.signTypedData(domain, types, message);
      return ethers.Signature.from(signature);
    }

    it("sets allowance from a valid signature and increments the nonce", async function () {
      const { token, treasury, alice, bob } = await loadFixture(deployFixture);
      const value = ethers.parseUnits("777", 18);
      const deadline = BigInt((await ethers.provider.getBlock("latest")).timestamp) + 3600n;
      const nonce = await token.nonces(treasury.address);
      expect(nonce).to.equal(0n);

      const { v, r, s } = await signPermit(token, treasury, alice.address, value, deadline, nonce);

      // Anyone (here bob) can submit the permit; the allowance belongs to treasury -> alice.
      await expect(token.connect(bob).permit(treasury.address, alice.address, value, deadline, v, r, s))
        .to.emit(token, "Approval")
        .withArgs(treasury.address, alice.address, value);

      expect(await token.allowance(treasury.address, alice.address)).to.equal(value);
      expect(await token.nonces(treasury.address)).to.equal(1n);

      // The allowance is usable.
      await token.connect(alice).transferFrom(treasury.address, bob.address, value);
      expect(await token.balanceOf(bob.address)).to.equal(value);
    });

    it("rejects a replayed signature", async function () {
      const { token, treasury, alice } = await loadFixture(deployFixture);
      const value = 1n;
      const deadline = BigInt((await ethers.provider.getBlock("latest")).timestamp) + 3600n;
      const { v, r, s } = await signPermit(token, treasury, alice.address, value, deadline, 0n);
      await token.permit(treasury.address, alice.address, value, deadline, v, r, s);
      await expect(
        token.permit(treasury.address, alice.address, value, deadline, v, r, s)
      ).to.be.revertedWithCustomError(token, "ERC2612InvalidSigner");
    });

    it("rejects an expired signature", async function () {
      const { token, treasury, alice } = await loadFixture(deployFixture);
      const value = 1n;
      const deadline = BigInt((await ethers.provider.getBlock("latest")).timestamp) - 1n;
      const { v, r, s } = await signPermit(token, treasury, alice.address, value, deadline, 0n);
      await expect(
        token.permit(treasury.address, alice.address, value, deadline, v, r, s)
      ).to.be.revertedWithCustomError(token, "ERC2612ExpiredSignature");
    });

    it("rejects a signature from a different signer", async function () {
      const { token, treasury, alice, bob } = await loadFixture(deployFixture);
      const value = 1n;
      const deadline = BigInt((await ethers.provider.getBlock("latest")).timestamp) + 3600n;
      // bob signs, but the permit claims the owner is treasury
      const { v, r, s } = await signPermit(token, bob, alice.address, value, deadline, 0n);
      await expect(
        token.permit(treasury.address, alice.address, value, deadline, v, r, s)
      ).to.be.revertedWithCustomError(token, "ERC2612InvalidSigner");
    });
  });
});
