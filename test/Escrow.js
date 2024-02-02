const { expect } = require("chai")
const { ethers, network } = require("hardhat")

const tokens = (n) => {
  return ethers.utils.parseUnits(n.toString(), "ether")
}

describe("Escrow", () => {
  let realEstate, escrow
  let buyer, seller, inspector, lender

  beforeEach(async () => {
    await network.provider.send("hardhat_reset")

    // Deploy RealEstate
    ;[buyer, seller, inspector, lender] = await ethers.getSigners()
    const RealEstate = await ethers.getContractFactory("RealEstate")
    realEstate = await RealEstate.deploy()

    // Mint
    let transaction = await realEstate
      .connect(seller)
      .mint(
        "https://ipfs.io/ipfs/QmTudSYeM7mz3PkYEWXWqPjomRPHogcMFSq7XAvsvsgAPS"
      )
    await transaction.wait()

    // Deploy Escrow
    const Escrow = await ethers.getContractFactory("Escrow")
    escrow = await Escrow.deploy(
      realEstate.address,
      seller.address,
      inspector.address,
      lender.address
    )

    // Approve property
    transaction = await realEstate.connect(seller).approve(escrow.address, 1)
    await transaction.wait()

    // List Property
    transaction = await escrow
      .connect(seller)
      .list(1, buyer.address, tokens(10), tokens(5))
    await transaction.wait()
  })

  describe("Deployment", () => {
    it("Should deploy real estate contract", async () => {
      expect(realEstate.address).to.not.equal("")
      expect(realEstate.address).to.not.equal(0x0)
      expect(realEstate.address).to.not.equal(null)
      expect(realEstate.address).to.not.equal(undefined)
    })

    it("Should deploy escrow contract", async () => {
      expect(escrow.address).to.not.equal("")
      expect(escrow.address).to.not.equal(0x0)
      expect(escrow.address).to.not.equal(null)
      expect(escrow.address).to.not.equal(undefined)
    })

    it("Should return NFT address", async () => {
      expect(await escrow.nftAddress()).to.equal(realEstate.address)
    })

    it("Should return seller address", async () => {
      expect(await escrow.seller()).to.equal(seller.address)
    })

    it("Should return inspector address", async () => {
      expect(await escrow.inspector()).to.equal(inspector.address)
    })

    it("Should return lender address", async () => {
      expect(await escrow.lender()).to.equal(lender.address)
    })

    it("Should return total supply", async () => {
      expect(await realEstate.totalSupply()).to.equal(1)
    })
  })

  describe("Listing", () => {
    it("Should only be listed by seller", async () => {
      const transaction = escrow
        .connect(buyer)
        .list(1, buyer.address, tokens(100), tokens(5))

      await expect(transaction).to.be.revertedWith(
        "Only the seller can call this function."
      )
    })

    it("Should updates the ownership", async () => {
      expect(await realEstate.ownerOf(1)).to.equal(escrow.address)
    })

    it("Should be listed", async () => {
      expect(await escrow.isListed(1)).to.equal(true)
    })

    it("Should have buyer", async () => {
      expect(await escrow.buyer(1)).to.equal(buyer.address)
    })

    it("Should have purchase price", async () => {
      expect(await escrow.purchasePrice(1)).to.equal(tokens(10))
    })

    it("Should have escrow amount", async () => {
      expect(await escrow.escrowAmount(1)).to.equal(tokens(5))
    })
  })

  describe("Deposits", () => {
    it("Should update contract balance", async () => {
      const transaction = await escrow
        .connect(buyer)
        .depositEarnest(1, { value: tokens(5) })
      await transaction.wait()
      const result = await escrow.getBalance()
      expect(result).to.equal(tokens(5))
    })
  })

  describe("Inspection", () => {
    it("Should update inspection status", async () => {
      const transaction = await escrow
        .connect(inspector)
        .updateInspectionStatus(1, true)
      await transaction.wait()
      expect(await escrow.inspectionPassed(1)).to.equal(true)
    })
  })

  describe("Approval", () => {
    it("Should update approve status", async () => {
      let transaction = await escrow.connect(buyer).approveSale(1)
      await transaction.wait()

      transaction = await escrow.connect(seller).approveSale(1)
      await transaction.wait()

      transaction = await escrow.connect(lender).approveSale(1)
      await transaction.wait()

      expect(await escrow.approval(1, buyer.address)).to.equal(true)
      expect(await escrow.approval(1, seller.address)).to.equal(true)
      expect(await escrow.approval(1, lender.address)).to.equal(true)
    })
  })

  describe("Sale", () => {
    beforeEach(async () => {
      let transaction = await escrow
        .connect(buyer)
        .depositEarnest(1, { value: tokens(5) })
      await transaction.wait()

      transaction = await escrow
        .connect(inspector)
        .updateInspectionStatus(1, true)
      await transaction.wait()

      transaction = await escrow.connect(buyer).approveSale(1)
      await transaction.wait()

      transaction = await escrow.connect(seller).approveSale(1)
      await transaction.wait()

      transaction = await escrow.connect(lender).approveSale(1)
      await transaction.wait()

      await lender.sendTransaction({ to: escrow.address, value: tokens(5) })

      transaction = await escrow.connect(seller).finalizeSale(1)
      await transaction.wait()
    })

    it("Should finalized sale", async () => {
      expect(await escrow.getBalance()).to.equal(0)
    })

    it("Should updates the ownership to the buyer", async () => {
      expect(await realEstate.ownerOf(1)).to.equal(buyer.address)
    })
  })

  describe("Cancel sale", () => {
    beforeEach(async () => {
      let transaction = await escrow
        .connect(buyer)
        .depositEarnest(1, { value: tokens(5) })
      await transaction.wait()
    })

    it("Should refund to buyer if inspection is not approved", async () => {
      const initialBuyerBalance = await buyer.getBalance()
      const initialContractBalance = await escrow.getBalance()
      let transaction = await escrow.connect(buyer).cancelSale(1)
      await transaction.wait()

      const finalBuyerBalance = await buyer.getBalance()
      const finalContractBalance = await escrow.getBalance()

      expect(finalBuyerBalance).to.greaterThan(initialBuyerBalance)
      expect(finalContractBalance).to.lessThan(initialContractBalance)
    })

    it("Should refund to seller if inspection is approved", async () => {
      let transaction = await escrow
        .connect(inspector)
        .updateInspectionStatus(1, true)
      await transaction.wait()

      const initialSellerBalance = await seller.getBalance()
      const initialContractBalance = await escrow.getBalance()
      transaction = await escrow.connect(buyer).cancelSale(1)
      await transaction.wait()

      const finalSellerBalance = await seller.getBalance()
      const finalContractBalance = await escrow.getBalance()

      expect(finalSellerBalance).to.greaterThan(initialSellerBalance)
      expect(finalContractBalance).to.lessThan(initialContractBalance)
    })
  })
})
