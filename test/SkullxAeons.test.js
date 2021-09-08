const {expect } = require("chai");

describe("SkullxAeons contract", function () {
  let SkullxAeons;
  let aeonsContract;
  let owner;
  let addr1;
  let addr2;
  let addrs;

  beforeEach(async function () {
    SkullxAeons = await ethers.getContractFactory("SkullxAeons");
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

    aeonsContract = await SkullxAeons.deploy("ipfs://123456789");
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await aeonsContract.owner()).to.equal(owner.address);
    });
    it("Should set base URI from param", async function () {
      const baseUri = await aeonsContract.baseURI()

      expect(baseUri).to.equal("ipfs://123456789");
    });
  });

  describe("Public Sale Mint", function () {
    it("Should fail on public sale not active", async function () {
      await expect(
        aeonsContract.connect(addr1).summon(1)
      ).to.be.revertedWith("Public sale is not active");
    });
    it("Should fail on minting more than 10", async function () {
      await aeonsContract.togglePublicSaleIsActive();
      await expect(
        aeonsContract.connect(addr1).summon(11)
      ).to.be.revertedWith("Exceeds SUMMON_LIMIT");
    });
    it("Should fail on minting more than 10", async function () {
      await aeonsContract.togglePublicSaleIsActive();
      await expect(
        aeonsContract.connect(addr1).summon(11)
      ).to.be.revertedWith("Exceeds SUMMON_LIMIT");
    });
    it("Should succeed when sale is open and correct eth amount", async function () {
      await aeonsContract.togglePublicSaleIsActive();
      const price = await aeonsContract.PRICE()
      const amount = 10;
      const value = price.mul(amount)

      await aeonsContract.connect(addr1).summon(amount, {
        value: value
      })

      const balance = await aeonsContract.balanceOf(addr1.address)
      expect(amount).to.equal(balance.toNumber());
    });
    it("Total supply should increase with right amount when minting", async function () {
      await aeonsContract.togglePublicSaleIsActive();
      const price = await aeonsContract.PRICE()
      const amount = 10;
      const value = price.mul(amount)

      await aeonsContract.connect(addr1).summon(amount, {
        value: value
      })

      const supply = await aeonsContract.totalSupply()
      expect(amount).to.equal(supply);
    });
    it("Should fail when sale is open and insufficient eth amount", async function () {
      await aeonsContract.togglePublicSaleIsActive();
      const price = await aeonsContract.PRICE()
      const amount = 10;
      const value = price.mul(9)

      await expect(
        aeonsContract.connect(addr1).summon(amount, {
          value: value
        })
      ).to.be.revertedWith("ETH amount is not sufficient");
    });
    it("Should fail on max supply reached, with no reserve mints", async function () {
      await aeonsContract.togglePublicSaleIsActive();
      const price = await aeonsContract.PRICE()
      const amount = 10;
      const value = price.mul(amount)

      const signedContract = aeonsContract.connect(addr1)
      for (let i = 0; i < 190; i++) {
        await signedContract.summon(amount, {
          value: value
        })
      }
      await expect(
        aeonsContract.connect(addr1).summon(1)
      ).to.be.revertedWith("Exceeds AEONS_MAX_SUPPLY");

    });
  });

  describe("Free Mint", function () {
    it("Should fail on free mint sale not active", async function () {
      await expect(
        aeonsContract.connect(addr1).freeSummon()
      ).to.be.revertedWith("Free summon phase for Skullx role is not active");
    });
    it("Should fail if not on allow list", async function () {
      await aeonsContract.toggleFreeMintIsActive();
      await expect(
        aeonsContract.connect(addr1).freeSummon()
      ).to.be.revertedWith("You are not on the Allow List");
    });
    it("Should succeed when on allow list", async function () {
      await aeonsContract.toggleFreeMintIsActive();
      await aeonsContract.addToAllowList([addr1.address]);
      await aeonsContract.connect(addr1).freeSummon()

      const balance = await aeonsContract.balanceOf(addr1.address);

      expect(balance).to.equal(1);
    });
    it("Should fail when try to mint a second time", async function () {
      await aeonsContract.toggleFreeMintIsActive();
      await aeonsContract.addToAllowList([addr1.address]);
      await aeonsContract.connect(addr1).freeSummon()

      await expect(
        aeonsContract.connect(addr1).freeSummon()
      ).to.be.revertedWith("Already summoned one free Aeon");

    });
    it("Total supply should increase with right amount when minting", async function () {
      await aeonsContract.toggleFreeMintIsActive();
      await aeonsContract.addToAllowList([addr1.address]);
      await aeonsContract.connect(addr1).freeSummon()

      const supply = await aeonsContract.totalSupply()
      expect(1).to.equal(supply);
    });
    it("Should fail after being added, then removed from allow list", async function () {
      await aeonsContract.toggleFreeMintIsActive();
      await aeonsContract.addToAllowList([addr1.address]);
      await aeonsContract.removeFromAllowList([addr1.address]);

      await expect(
        aeonsContract.connect(addr1).freeSummon()
      ).to.be.revertedWith("You are not on the Allow List");
    });
    // TODO long test, unncomment when done
    it("Should fail on max supply reached, with no reserve mints", async function () {
      await aeonsContract.togglePublicSaleIsActive();
      await aeonsContract.toggleFreeMintIsActive();
      await aeonsContract.addToAllowList([addr1.address]);
      const price = await aeonsContract.PRICE()
      const amount = 10;
      const value = price.mul(amount)

      const signedContract = aeonsContract.connect(addr1)
      for (let i = 0; i < 190; i++) {
        await signedContract.summon(amount, {
          value: value
        })
      }
      await expect(
        aeonsContract.connect(addr1).freeSummon()
      ).to.be.revertedWith("Exceeds AEONS_MAX_SUPPLY");

    });
  });

  describe("Giveaway", function () {
    it("Should mint right amount to given address with giveaway function", async function () {
      const amount = 100
      await aeonsContract.giveAway(addrs[0].address, amount);
      const balance = await aeonsContract.balanceOf(addrs[0].address);
      expect(amount).to.equal(balance.toNumber());
    });
    it("Should fail on minting 101 reserves", async function () {
      const amount = 101
      await expect(
        aeonsContract.giveAway(owner.address, amount)
      ).to.be.revertedWith("Exceeds reserved Aeons left");
    });
    it("Should fail if not owner", async function () {
      const amount = 100
      await expect(
        aeonsContract.connect(addr1).giveAway(addr1.address, amount)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Toggle sale states", function () {
    it("Should fail on toggling free mint is active when not owner", async function () {
      await expect(
        aeonsContract.connect(addr1).toggleFreeMintIsActive()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
    it("Should fail on toggling public sale is active when not owner", async function () {
      await expect(
        aeonsContract.connect(addr1).togglePublicSaleIsActive()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
    it("Free mint sale is inactive by default", async function () {
      const isActive = await aeonsContract.freeMintIsActive()
      expect(isActive).to.equal(false)
    });
    it("Public sale is inactive by default", async function () {
      const isActive = await aeonsContract.publicSaleIsActive()
      expect(isActive).to.equal(false)
    });
    it("Owner can toggle free mint sale successfully", async function () {
      await aeonsContract.connect(owner).toggleFreeMintIsActive();
      const isActive = await aeonsContract.freeMintIsActive()
      expect(isActive).to.equal(true)
    });
    it("Owner can toggle public sale successfully", async function () {
      await aeonsContract.connect(owner).togglePublicSaleIsActive();
      const isActive = await aeonsContract.publicSaleIsActive()
      expect(isActive).to.equal(true)
    });
  });
  describe("Withdraw Balance", function () {
    it("Should fail when not owner", async function () {
      await expect(
        aeonsContract.connect(addr1).withdrawAll()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
  describe("Provenance Hash", function () {
    it("Should fail when not owner", async function () {
      await expect(
        aeonsContract.connect(addr1).setProvenanceHash("somehash")
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
    it("Should set provenance hash", async function () {
      const provenanceHash = "somehash"
      await aeonsContract.connect(owner).setProvenanceHash(provenanceHash)

      const aeonsProvenance = await aeonsContract.aeonsProvenance()

      expect(aeonsProvenance).to.equal(provenanceHash);
    });
  });
  describe("Base URI", function () {
    it("Should fail when not owner", async function () {
      await expect(
        aeonsContract.connect(addr1).setBaseURI("somehash")
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
    it("Should set base URI", async function () {
      const newBaseUri = "ipfs://987654321"
      await aeonsContract.connect(owner).setBaseURI(newBaseUri)

      const baseUri = await aeonsContract.baseURI()

      expect(baseUri).to.equal(newBaseUri);
    });
  });
});
