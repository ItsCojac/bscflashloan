const { ethers } = require('ethers')

function getProvider(chainId) {
  const rpcUrl = getRpcUrl(chainId)
  return new ethers.providers.JsonRpcProvider(rpcUrl)
}

async function getWallet(privateKey, chainId) {
  const provider = getProvider(chainId)
  return new ethers.Wallet(privateKey, provider)
}

async function signTransaction(wallet, transaction) {
  const { gasPrice, gasLimit, to, value, data } = transaction

  const nonce = await wallet.getTransactionCount()
  const tx = {
    nonce: ethers.utils.hexlify(nonce),
    gasPrice: ethers.utils.parseUnits(gasPrice.toString(), 'gwei'),
    gasLimit: ethers.utils.hexlify(gasLimit),
    to: ethers.utils.getAddress(to),
    value: ethers.utils.parseEther(value.toString()),
    data: data || '0x',
  }

  const signedTx = await wallet.signTransaction(tx)
  return signedTx
}

async function sendSignedTransaction(signedTransaction) {
  const provider = new ethers.providers.JsonRpcProvider(getRpcUrl(chainId))
  const response = await provider.sendTransaction(signedTransaction)
  return response
}

module.exports = {
  getProvider,
  getWallet,
  signTransaction,
  sendSignedTransaction,
}
