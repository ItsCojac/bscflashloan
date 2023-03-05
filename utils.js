const axios = require('axios')
const BigNumber = require('bignumber.js')
const Web3 = require('web3')
const web3 = new Web3(new Web3.providers.HttpProvider(process.env.BSC_RPC))

// Read token pairs from token-pairs.json file
const tokenPairs = require('./token-pairs.json')

// Fetches the reserves of the given token on the given exchange
async function getReserves(exchange, token) {
  const response = await axios.get(
    `https://api.pancakeswap.info/api/v2/exchanges/${exchange}/pairs`,
  )
  const pair = response.data.data.find((pair) => pair.symbol.includes(token))
  if (!pair) {
    throw new Error(
      `Could not find pair for token ${token} on exchange ${exchange}`,
    )
  }
  const token0 = pair.token0.symbol === token ? pair.token0 : pair.token1
  const token1 = pair.token1.symbol === token ? pair.token1 : pair.token0
  return { token0: token0.reserve, token1: token1.reserve }
}

// Calculates the expected output amount for a trade with the given input amount and reserves
function getOutputAmount(inputAmount, inputReserve, outputReserve) {
  const inputAmountWithFee = new BigNumber(inputAmount).times(997)
  const numerator = inputAmountWithFee.times(outputReserve)
  const denominator = inputReserve.times(1000).plus(inputAmountWithFee)
  return numerator.div(denominator)
}

// Returns the best arbitrage opportunity for the given token pair
async function findBestOpportunity(tokenPair) {
  const [buyToken, sellToken] = tokenPair
  const exchanges = ['PancakeSwap', 'Mdex']
  let bestOpportunity = null
  for (const exchange of exchanges) {
    const [inputToken, outputToken] =
      exchange === 'PancakeSwap' ? [buyToken, sellToken] : [sellToken, buyToken]
    const { token0: inputReserve, token1: outputReserve } = await getReserves(
      exchange,
      inputToken,
    )
    const outputAmount = getOutputAmount(1e18, inputReserve, outputReserve)
    const outputAmountInWei = Web3.utils.toWei(outputAmount.toFixed(), 'ether')
    const expectedInputAmount = new BigNumber(1e18)
      .div(outputAmount)
      .times(outputReserve)
    const expectedInputAmountInWei = Web3.utils.toWei(
      expectedInputAmount.toFixed(),
      'ether',
    )
    const profit = expectedInputAmount.minus(1e18).toFixed()
    if (bestOpportunity === null || profit > bestOpportunity.profit) {
      bestOpportunity = {
        exchange,
        inputToken,
        outputToken,
        inputAmount: expectedInputAmountInWei,
        outputAmount: outputAmountInWei,
        profit,
      }
    }
  }
  return bestOpportunity
}

module.exports = {
  findBestOpportunity,
  getTokenPairs: () => tokenPairs,
}
