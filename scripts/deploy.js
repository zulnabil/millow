// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat")

async function main() {
  // Set up accounts
  const [buyer, seller, inspector, lender] = await hre.ethers.getSigners()

  // Deploy RealEstate
  const RealEstate = await hre.ethers.getContractFactory("RealEstate")
  const realEstate = await RealEstate.deploy()
  await realEstate.deployed()

  console.log("RealEstate deployed to:", realEstate.address)
  console.log("Minting 3 properties...\n")

  for (let i = 1; i <= 3; i++) {
    // Mint
    let transaction = await realEstate
      .connect(seller)
      .mint(
        `https://ipfs.io/ipfs/QmQVcpsjrA6cr1iJjZAodYwmPekYgbnXGo4DFubJiLc2EB/${
          i + 1
        }.json`
      )
    await transaction.wait()
    console.log("Minted property #" + i)
  }

  // Deploy Escrow
  const Escrow = await hre.ethers.getContractFactory("Escrow")
  const escrow = await Escrow.deploy(
    realEstate.address,
    seller.address,
    inspector.address,
    lender.address
  )
  await escrow.deployed()

  for (let i = 1; i <= 3; i++) {
    // Approve property
    let transaction = await realEstate
      .connect(seller)
      .approve(escrow.address, i)
    await transaction.wait()
    console.log("Approved property #" + i)
  }

  // List Property
  let transaction = await escrow
    .connect(seller)
    .list(1, buyer.address, tokens(20), tokens(10))
  await transaction.wait()
  console.log("Listed property #1")

  transaction = await escrow
    .connect(seller)
    .list(2, buyer.address, tokens(15), tokens(5))
  await transaction.wait()
  console.log("Listed property #2")

  transaction = await escrow
    .connect(seller)
    .list(3, buyer.address, tokens(10), tokens(5))
  await transaction.wait()
  console.log("Listed property #3")

  console.log("\nDone!")
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

const tokens = (n) => {
  return hre.ethers.utils.parseUnits(n.toString(), "ether")
}
