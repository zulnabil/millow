const hre = require("hardhat")

describe("Reset", () => {
  beforeEach(async () => {
    await hre.network.provider.send("hardhat_reset")
  })

  it("Should reset the network", async () => {
    //
  })
})
