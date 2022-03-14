const createNative = require('./native')
const createBitspace = require('./bitspace')

module.exports = async function createMixed (n) {
  const nNative = Math.ceil(n / 2)
  const nBitspace = n - nNative
  const native = await createNative(nNative)
  const bitspace = await createBitspace(nBitspace)
  const sdks = []
  for (let i = 0; i < n; i++) {
    sdks.push(i % 2 === 0 ? native.sdks.shift() : bitspace.sdks.shift())
  }
  return { sdks, cleanup }

  async function cleanup () {
    console.log('# [test/mixed] cleanup start (cleans up native and bitspace)')
    await Promise.all([
      bitspace.cleanup(),
      native.cleanup()
    ])
    console.log('# [test/mixed] cleanup end')
  }
}
