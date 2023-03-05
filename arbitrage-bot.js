require('dotenv').config();
const Web3 = require('web3');
const { getPairData, getPrice, getGasPrice } = require('./chainUtils');
const tokenPairs = require('./token-pairs.json');

const web3 = new Web3(process.env.BSC_NODE_URL);

const minProfitPercent = parseFloat(process.env.MIN_PROFIT_PERCENT);
const maxSlippagePercent = parseFloat(process.env.MAX_SLIPPAGE_PERCENT);
const maxGasPriceGwei = parseFloat(process.env.MAX_GAS_PRICE_GWEI);

async function executeArbitrage(opportunity, gasPrice) {
  console.log(`Executing arbitrage opportunity: ${JSON.stringify(opportunity, null, 2)}`);

  const routerAddress = '0x10ED43C718714eb63d5aA57B78B54704E256024E'; // PancakeSwap router address
  const router = new web3.eth.Contract(abi, routerAddress);

  const [baseToken, quoteToken] = opportunity.tokenPair.split('-');
  const [baseTokenAddress, quoteTokenAddress] = [baseToken, quoteToken].map(token => token.toLowerCase() === 'bnb' ? web3.utils.toChecksumAddress('0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c') : token);

  const priceBefore = await getPrice(baseTokenAddress, quoteTokenAddress, routerAddress);
  console.log(`Price before swap: ${priceBefore}`);

  const [baseTokenReserveBefore, quoteTokenReserveBefore] = await getPairData(opportunity.pairAddress, web3.currentProvider);
  console.log(`Reserve before swap: baseToken=${baseTokenReserveBefore}, quoteToken=${quoteTokenReserveBefore}`);

  const slippageAdjustedAmountIn = web3.utils.toWei(opportunity.amountIn.toString(), 'ether') * (1 - maxSlippagePercent / 100);
  const path = [baseTokenAddress, quoteTokenAddress];
  const amounts = await router.methods.getAmountsOut(slippageAdjustedAmountIn, path).call(undefined, 'latest');

  const expectedAmountOut = amounts[1];
  const slippageAdjustedAmountOut = expectedAmountOut * (1 - maxSlippagePercent / 100);

  const tx = router.methods.swapExactTokensForTokens(
    slippageAdjustedAmountIn,
    slippageAdjustedAmountOut,
    path,
    process.env.RECIPIENT_ADDRESS,
    Math.floor(Date.now() / 1000) + 60 * 10 // deadline 10 minutes from now
  );

  const gas = await tx.estimateGas({ from: process.env.TRADER_ADDRESS });
  const gasCost = gas * gasPrice;
  const profit = (slippageAdjustedAmountOut - slippageAdjustedAmountIn) - gasCost;

  console.log(`Estimated gas: ${gas}`);
  console.log(`Gas price: ${gasPrice} Gwei`);
  console.log(`Gas cost: ${web3.utils.fromWei(gasCost.toString(), 'ether')} BNB`);

  if (profit < 0 || profit / slippageAdjustedAmountIn * 100 < minProfitPercent) {
    console.log(`Not profitable, expected profit: ${web3.utils.fromWei(profit.toString(), 'ether')} BNB`);
    return;
  }

  if (gasPrice > maxGasPriceGwei * 1e9) {
    console.log(`Gas price too high, current gas price: ${gasPrice} Gwei`);
    return;
  }

  const privateKey = process.env.TRADER_PRIVATE_KEY;
const account = web3.eth.accounts.privateKeyToAccount(privateKey);
web3.eth.accounts.wallet.add(account);

const nonce = await web3.eth.getTransactionCount(process.env.TRADER_ADDRESS);

const txData = {
from: process.env.TRADER_ADDRESS,
to: routerAddress,
gas: Math.floor(gas * 1.1),
gasPrice: gasPrice * 1e9, // Convert Gwei to Wei
data: tx.encodeABI(),
nonce: nonce,
};

const signedTx = await web3.eth.accounts.signTransaction(txData, privateKey);
const txReceipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
console.log(`Transaction hash: ${txReceipt.transactionHash}`);
console.log(`Transaction successful!`);

const priceAfter = await getPrice(baseTokenAddress, quoteTokenAddress, routerAddress);
console.log(`Price after swap: ${priceAfter}`);

const [baseTokenReserveAfter, quoteTokenReserveAfter] = await getPairData(opportunity.pairAddress, web3.currentProvider);
console.log(`Reserve after swap: baseToken=${baseTokenReserveAfter}, quoteToken=${quoteTokenReserveAfter}`);

const actualProfit = (slippageAdjustedAmountOut - slippageAdjustedAmountIn) - web3.utils.fromWei(txReceipt.gasUsed.toString(), 'ether');
console.log(`Profit: ${actualProfit} BNB`);
}

async function main() {
  const gasPrice = await getGasPrice(web3.currentProvider);
  console.log(`Current gas price: ${gasPrice} Gwei`);

  for (const tokenPair of tokenPairs) {
    const opportunity = await findArbitrageOpportunity(tokenPair);
    if (opportunity) {
      await executeArbitrage(opportunity, gasPrice);
    }
  }
}

main().catch(console.error);


  