const axios = require('axios');
const Web3 = require('web3');

const web3 = new Web3();

async function getPairData(pairAddress, providerUrl) {
  const abi = [
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_tokenA",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "_tokenB",
          "type": "address"
        }
      ],
      "name": "getReserves",
      "outputs": [
        {
          "internalType": "uint112",
          "name": "_reserve0",
          "type": "uint112"
        },
        {
          "internalType": "uint112",
          "name": "_reserve1",
          "type": "uint112"
        },
        {
          "internalType": "uint32",
          "name": "_blockTimestampLast",
          "type": "uint32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    }
  ];

  const contract = new web3.eth.Contract(abi, pairAddress);

  const [reserve0, reserve1] = await contract.methods.getReserves().call(undefined, 'latest');

  return {
    reserve0,
    reserve1,
  };
}

async function getPrice(baseToken, quoteToken, providerUrl) {
  const routerAddress = '0x10ED43C718714eb63d5aA57B78B54704E256024E'; // PancakeSwap router address
  const router = new web3.eth.Contract(abi, routerAddress);

  const baseTokenAmount = web3.utils.toWei('1', 'ether');
  const path = [baseToken, quoteToken];
  const amounts = await router.methods.getAmountsOut(baseTokenAmount, path).call(undefined, 'latest');
  const price = parseFloat(web3.utils.fromWei(amounts[1], 'ether')) / parseFloat(web3.utils.fromWei(amounts[0], 'ether'));

  return price;
}

async function getGasPrice() {
  try {
    const response = await axios.get('https://bscgas.info/gas');
    const gasPrice = parseFloat(response.data.standard) / 10;
    return gasPrice;
  } catch (error) {
    console.error(`Error fetching gas price: ${error}`);
    return null;
  }
}

module.exports = {
  getPairData,
  getPrice,
  getGasPrice,
};
