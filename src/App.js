import { useEffect, useState } from "react"
import { ethers } from "ethers"

// Components
import Navigation from "./components/Navigation"
import Search from "./components/Search"
import Home from "./components/Home"

// ABIs
import RealEstate from "./abis/RealEstate.json"
import Escrow from "./abis/Escrow.json"

// Config
import config from "./config.json"

function App() {
  const [provider, setProvider] = useState(null)
  const [account, setAccount] = useState(null)
  const [escrow, setEscrow] = useState(null)
  const [realEstate, setRealEstate] = useState(null)
  const [homes, setHomes] = useState([])
  const [home, setHome] = useState(null)
  const [toggle, setToggle] = useState(false)

  const loadBlockchainData = async () => {
    const provider = new ethers.providers.Web3Provider(window.ethereum)
    setProvider(provider)

    const network = await provider.getNetwork()

    const realEstateAddress = config[network.chainId].realEstate.address

    const realEstate = new ethers.Contract(
      realEstateAddress,
      RealEstate,
      provider
    )
    const totalSupply = await realEstate.totalSupply()
    const homes = []

    for (let i = 1; i <= totalSupply; i++) {
      const uri = await realEstate.tokenURI(i)
      // console.debug("URI", uri)
      const home = await fetch(uri).then((res) => res.json())
      homes.push(home)
    }

    setHomes(homes)

    // console.debug("Homes", homes)

    const escrowAddress = config[network.chainId].escrow.address
    const escrow = new ethers.Contract(escrowAddress, Escrow, provider)
    setEscrow(escrow)

    window.ethereum.on("accountsChanged", async () => {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      })
      const account = ethers.utils.getAddress(accounts[0])
      console.debug("Account", account)
      setAccount(account)
    })
  }

  useEffect(() => {
    loadBlockchainData()
  }, [])

  function handleToggle(home) {
    setHome(home)
    setToggle(!toggle)
  }

  return (
    <div>
      <Navigation account={account} setAccount={setAccount} />
      <Search />
      <div className="cards__section">
        <h3>Homes For You</h3>

        <hr />

        <div className="cards">
          {homes.map((home, index) => (
            <div
              className="card"
              key={home.id}
              onClick={() => handleToggle(home)}
            >
              <div className="card__image">
                <img src={home.image} alt="Home" />
              </div>
              <div className="card__info">
                <h4>{home.attributes[0]?.value} ETH</h4>
                <p>
                  <strong>{home.attributes[2]?.value}</strong> bds |
                  <strong>{home.attributes[3]?.value}</strong> ba |
                  <strong>{home.attributes[4]?.value}</strong> sqft
                </p>
                <p>{home.address}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {toggle && (
        <Home
          account={account}
          home={home}
          provider={provider}
          escrow={escrow}
          togglePop={handleToggle}
        />
      )}
    </div>
  )
}

export default App
