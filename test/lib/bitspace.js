const SDK = require('../../bitspace')
const { isBrowser } = require('./env')

const BITSPACE_TEST_PORT = 9000

module.exports = async function createBitspace (n) {
  const cleanups = []
  const sdks = []
  if (!isBrowser) {
    const { createMany } = require('bitspace/test/helpers/create')
    const { clients, cleanup: cleanupBitspace } = await createMany(n)
    cleanups.push(cleanupBitspace)
    for (const client of clients) {
      const sdk = await SDK({
        bitspaceOpts: { client }
      })
      sdks.push(sdk)
    }
  } else {
    let port = BITSPACE_TEST_PORT
    while (port < BITSPACE_TEST_PORT + n) {
      const sdk = await SDK({
        bitspaceOpts: { port }
      })
      sdks.push(sdk)
      port++
    }
  }

  return { sdks, cleanup }

  async function cleanup () {
    console.log('# [test/bitspace] cleanup start')
    await Promise.all(cleanups.map(cleanup => cleanup()))
    console.log('# [test/bitspace] cleanup end')
  }
}
