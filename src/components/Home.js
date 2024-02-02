import { ethers } from "ethers"
import { useEffect, useState } from "react"

import close from "../assets/close.svg"

const Home = ({ home, provider, account, escrow, togglePop }) => {
  const [buyer, setBuyer] = useState(null)
  const [seller, setSeller] = useState(null)
  const [lender, setLender] = useState(null)
  const [inspector, setInspector] = useState(null)
  const [owner, setOwner] = useState(null)

  const [hasBought, setHasBought] = useState(false)
  const [hasLended, setHasLended] = useState(false)
  const [hasInspected, setHasInspected] = useState(false)
  const [hasSold, setHasSold] = useState(false)

  async function fetchDetails() {
    const [buyer, seller, lender, inspector] = await Promise.all([
      escrow.buyer(home.id),
      escrow.seller(),
      escrow.lender(),
      escrow.inspector(),
    ])

    console.debug("Buyer", buyer)
    console.debug("Seller", seller)
    console.debug("Lender", lender)
    console.debug("Inspector", inspector)

    setBuyer(buyer)
    setSeller(seller)
    setLender(lender)
    setInspector(inspector)

    const [hasBought, hasSold, hasLended, hasInspected] = await Promise.all([
      escrow.approval(home.id, buyer),
      escrow.approval(home.id, seller),
      escrow.approval(home.id, lender),
      escrow.inspectionPassed(home.id),
    ])
    setHasBought(hasBought)
    setHasSold(hasSold)
    setHasLended(hasLended)
    setHasInspected(hasInspected)
  }

  async function fetchOwner() {
    if (await escrow.isListed(home.id)) return

    const owner = await escrow.buyer(home.id)
    setOwner(owner)
  }

  useEffect(() => {
    fetchDetails()
    fetchOwner()
  }, [hasSold])

  async function handleInspect() {
    const transaction = await escrow
      .connect(await provider.getSigner())
      .updateInspectionStatus(home.id, true)
    await transaction.wait()
    setHasInspected(true)
  }

  async function handleLend() {
    const signer = await provider.getSigner()
    // Lender appprove
    const transaction = await escrow.connect(signer).approveSale(home.id)
    await transaction.wait()

    const lendAmount =
      (await escrow.purchasePrice(home.id)) -
      (await escrow.escrowAmount(home.id))
    await signer.sendTransaction({
      to: escrow.address,
      value: lendAmount.toString(),
      gasLimit: 60000,
    })

    setHasLended(true)
  }

  async function handleSell() {
    const signer = await provider.getSigner()

    // Seller approve
    let transaction = await escrow.connect(signer).approveSale(home.id)
    await transaction.wait()

    // Seller finalize
    transaction = await escrow.connect(signer).finalizeSale(home.id)
    await transaction.wait()
    setHasSold(true)
  }

  async function handleBuy() {
    const escrowAmount = await escrow.escrowAmount(home.id)
    const signer = await provider.getSigner()

    // Buyer deposit earnest
    let transaction = await escrow
      .connect(signer)
      .depositEarnest(home.id, { value: escrowAmount })
    await transaction.wait()

    // Buyer approve sale
    transaction = await escrow.connect(signer).approveSale(home.id)
    await transaction.wait()

    setHasBought(true)
  }

  const isBuyer = account && account === buyer
  const isSeller = account && account === seller
  const isLender = account && account === lender
  const isInspector = account && account === inspector

  return (
    <div className="home">
      <div className="home__details">
        <div className="home__image">
          <img src={home.image} alt="Home" />
        </div>
        <div className="home__overview">
          <h1>{home.name}</h1>
          <p>
            <strong>{home.attributes[2]?.value}</strong> bds |
            <strong>{home.attributes[3]?.value}</strong> ba |
            <strong>{home.attributes[4]?.value}</strong> sqft
          </p>
          <p>{home.address}</p>
          <h2>{home.attributes[0]?.value} ETH</h2>

          {!!owner && (
            <div className="home__owned">
              Owned by {owner.slice(0, 6)}...{owner.slice(-4)}
            </div>
          )}

          <div>
            {isInspector && (
              <button
                className="home__buy"
                onClick={handleInspect}
                disabled={hasInspected}
              >
                Approve Inspection
              </button>
            )}
            {isLender && (
              <button
                className="home__buy"
                onClick={handleLend}
                disabled={hasLended}
              >
                Approve Loan
              </button>
            )}
            {isSeller && (
              <button
                className="home__buy"
                onClick={handleSell}
                disabled={hasSold}
              >
                Approve Sale
              </button>
            )}
            {isBuyer && (
              <button
                className="home__buy"
                onClick={handleBuy}
                disabled={hasBought}
              >
                Buy
              </button>
            )}
            <button className="home__contact">Contact agent</button>
          </div>

          <hr />

          <h2>Overview</h2>

          <p>{home.description}</p>

          <hr />
          <h2>Facts and features</h2>
          <ul>
            {home.attributes.map((attribute, index) => (
              <li key={index}>
                <strong>{attribute.trait_type}</strong>: {attribute.value}
              </li>
            ))}
          </ul>
        </div>
        <button className="home__close" onClick={togglePop}>
          <img src={close} alt="Close" />
        </button>
      </div>
    </div>
  )
}

export default Home
