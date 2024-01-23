const { expect } = require("chai")
const { ethers } = require("hardhat")

const tokens = (n) => {
  return ethers.utils.parseUnits(n.toString(), "ether")
}

describe("Escrow", () => {
  let realEstate, escrow
  let buyer, seller, inspector, lender

  beforeEach(async () => {
    ;[buyer, seller, inspector, lender] = await ethers.getSigners()
    const RealEstate = await ethers.getContractFactory("RealEstate")
    realEstate = await RealEstate.deploy()

    const Escrow = await ethers.getContractFactory("Escrow")
    escrow = await Escrow.deploy(
      realEstate.address,
      seller.address,
      inspector.address,
      lender.address
    )
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
  })
})
