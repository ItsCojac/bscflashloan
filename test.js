const chai = require('chai');
const assert = chai.assert;
const expect = chai.expect;
const { findArbitrageOpportunity } = require('./arbitrage-bot');
const { getPairData } = require('./chainUtils');
const { getGasPrice } = require('./utils');

describe('Arbitrage Bot Tests', function() {
  it('should return an opportunity object when an arbitrage opportunity exists', async function() {
    const tokenPair = { buyToken: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', sellToken: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56' };
    const opportunity = await findArbitrageOpportunity(tokenPair);
    expect(opportunity).to.have.property('amountIn');
    expect(opportunity).to.have.property('amountOut');
    expect(opportunity).to.have.property('pairAddress');
  });

  it('should return the correct pair data for a given pair address', async function() {
    const pairAddress = '0x7c5ae6a175b6f43eb3e8b7d38d0bb7c7ba2bbf23';
    const [baseTokenReserve, quoteTokenReserve] = await getPairData(pairAddress);
    assert.isNumber(Number(baseTokenReserve));
    assert.isNumber(Number(quoteTokenReserve));
  });

  it('should return the current gas price in Gwei', async function() {
    const gasPrice = await getGasPrice();
    assert.isNumber(Number(gasPrice));
  });
});
