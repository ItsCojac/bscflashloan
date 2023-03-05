const Web3 = require('web3')
const { getPairData } = require('./chainUtils')

async function getGasPrice(chainId) {
  const providerUrl = getProviderUrl(chainId)
  const web3 = new Web3(providerUrl)
  const gasPrice = await web3.eth.getGasPrice()
  return gasPrice
}

async function findArbitrageOpportunities() {
  const chainIds = [56, 137] // Binance Smart Chain and Polygon
  for (const chainId of chainIds) {
    const pairs = require(`./token-pairs/${chainId}.json`)
    const gasPrice = await getGasPrice(chainId)
    for (const pair of pairs) {
      const { buyToken, sellToken } = pair
      const pairData = await getPairData(chainId, buyToken, sellToken)
      if (!pairData) {
        continue
      }
      const { buyTokenPrice, sellTokenPrice } = pairData
      const profit = calculateProfit(buyTokenPrice, sellTokenPrice)
      if (profit > 0) {
        console.log(`Found arbitrage opportunity on chain ${chainId}:`, pair)
        // execute arbitrage trade here
      }
    }
  }
}

function calculateProfit(buyPrice, sellPrice) {
  const fee = 0.003 // 0.3%
  const revenue = sellPrice * (1 - fee)
  const cost = buyPrice * (1 + fee)
  const profit = revenue / cost - 1
  return profit
}

async function main() {
  try {
    await findArbitrageOpportunities()
  } catch (error) {
    console.error('Error:', error)
  }
}

main()
