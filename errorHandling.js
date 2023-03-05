const { ethers } = require('ethers');
const { getAmountOut, getAmountIn, getAmountInMax } = require('./utils');
const tokenPairs = require('./token-pairs');

// Initialize provider and signer
const provider = new ethers.providers.JsonRpcProvider();
const privateKey = 'YOUR_PRIVATE_KEY_HERE';
const signer = new ethers.Wallet(privateKey, provider);

// Initialize constants
const AMOUNT_IN = ethers.utils.parseEther('1000');
const SLIPPAGE_TOLERANCE = 2;

// Main function to find and execute arbitrage opportunities
async function executeArbitrage() {
  for (const pair of tokenPairs) {
    const { buyToken, sellToken, decimals } = pair;

    // Get reserves for buy and sell tokens
    const sellTokenContract = new ethers.Contract(sellToken, ['function balanceOf(address) view returns (uint256)'], provider);
    const sellTokenBalance = await sellTokenContract.balanceOf(signer.address);
    const sellTokenReserve = sellTokenBalance.div(ethers.utils.parseEther('1')).toString();

    const buyTokenContract = new ethers.Contract(buyToken, ['function balanceOf(address) view returns (uint256)'], provider);
    const buyTokenBalance = await buyTokenContract.balanceOf(signer.address);
    const buyTokenReserve = buyTokenBalance.div(ethers.utils.parseEther('1')).toString();

    // Calculate arbitrage opportunity
    const amountOut = getAmountOut(AMOUNT_IN, buyTokenReserve, sellTokenReserve);
    const amountInMax = getAmountInMax(amountOut, { buyToken, sellToken }, SLIPPAGE_TOLERANCE);

    if (amountOut.gt(AMOUNT_IN) && amountInMax.lte(buyTokenBalance)) {
      console.log(`Found arbitrage opportunity! Buying ${amountInMax.toString()} ${buyToken} for ${AMOUNT_IN.toString()} ${sellToken}`);

      // Execute flash loan and buy low
      const swapTx = await executeSwap(amountInMax, buyToken, sellToken, decimals);
      console.log(`Executed swap. Tx hash: ${swapTx.hash}`);

      // Sell high and repay flash loan
      const amountOutSell = getAmountOut(amountInMax, sellTokenReserve, buyTokenReserve);
      const repayAmount = amountInMax.add(amountOutSell);
      const repayTx = await executeRepay(repayAmount, buyToken, sellToken, decimals);
      console.log(`Repaid flash loan. Tx hash: ${repayTx.hash}`);

      return;
    }
  }

  console.log('No arbitrage opportunities found');
}

// Function to execute swap
async function executeSwap(amountIn, buyToken, sellToken, decimals) {
  const uniswapV2Router02 = '0x10ED43C718714eb63d5aA57B78B54704E256024E';
  const buyTokenAddress = ethers.utils.getAddress(buyToken);
  const sellTokenAddress = ethers.utils.getAddress(sellToken);
  const slippage = SLIPPAGE_TOLERANCE / 100;

  const uniswapV2Router02Contract = new ethers.Contract(uniswapV2Router02, [
    'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)',
    'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
    ], signer);

        const buyTokenDecimals = await getDecimals(buyTokenAddress);      
        const amountInWithDecimals = ethers.utils.parseUnits(amountIn.toString(), buyTokenDecimals);
        const amountOutMin = getAmountOut(amountInWithDecimals, buyTokenReserve, sellTokenReserve).mul(ethers.BigNumber.from(100).sub(slippage)).div(ethers.BigNumber.from(100));
      
        const path = [buyTokenAddress, sellTokenAddress];
        const swapTx = await uniswapV2Router02Contract.swapExactTokensForTokens(amountInWithDecimals, amountOutMin, path, signer.address, Date.now() + 1000 * 60 * 5);
        return swapTx;
      }
      
      // Function to execute flash loan repayment
      async function executeRepay(amount, buyToken, sellToken, decimals) {
        const flashLoanContract = 'YOUR_FLASH_LOAN_CONTRACT_ADDRESS_HERE';
        const buyTokenAddress = ethers.utils.getAddress(buyToken);
        const sellTokenAddress = ethers.utils.getAddress(sellToken);
      
        const buyTokenContract = new ethers.Contract(buyToken, ['function approve(address spender, uint256 amount) public returns (bool)'], signer);
        const txApprove = await buyTokenContract.approve(flashLoanContract, amount);
        await txApprove.wait();
      
        const flashLoanContractInstance = new ethers.Contract(flashLoanContract, [
          'function executeArbitrage(address tokenA, address tokenB, uint amountA, uint amountB) external',
        ], signer);
      
        const amountWithDecimals = ethers.utils.parseUnits(amount.toString(), decimals);
        const txExecute = await flashLoanContractInstance.executeArbitrage(buyTokenAddress, sellTokenAddress, amountWithDecimals, ethers.constants.Zero);
        return txExecute;
      }
      
      // Function to get decimals of a token
      async function getDecimals(tokenAddress) {
        const contract = new ethers.Contract(tokenAddress, ['function decimals() public view returns (uint8)'], provider);
        const decimals = await contract.decimals();
        return decimals;
      }
      
      module.exports = { executeArbitrage, executeSwap, executeRepay };
      