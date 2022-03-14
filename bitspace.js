const BitspaceClient = require('bitspace-client')
const { connect } = require('webnet')
const SDK = require('./sdk')

const isBrowser = process.title === 'browser'

module.exports = async function createSDK (opts) {
  return SDK({ ...opts, backend: bitspaceBackend })
}
module.exports.createBackend = bitspaceBackend

async function bitspaceBackend (opts) {
  let {
    chainstore,
    bitspaceOpts = {}
  } = opts

  let bitspaceClient
  if (!chainstore) {
    let { client, protocol, port, host } = bitspaceOpts
    if (client) {
      bitspaceClient = client
    } else {
      if (!protocol) {
        protocol = isBrowser ? 'ws' : 'uds'
      }
      let clientOpts
      if (protocol === 'ws') {
        port = port || 9000
        clientOpts = connect(port, host)
      } else if (protocol === 'uds') {
        clientOpts = { host, port }
      }
      bitspaceClient = new BitspaceClient(clientOpts)
    }
    await bitspaceClient.ready()
    chainstore = bitspaceClient.chainstore()
  }

  await bitspaceClient.network.ready()
  const swarm = bitspaceClient.network
  const keyPair = bitspaceClient.network.keyPair

  return {
    chainstore,
    swarm,
    keyPair,
    deriveSecret,
    close
  }

  async function deriveSecret (namespace, name) {
    throw new Error('Deriving secrets is not supported')
  }

  function close (cb) {
    chainstore.close(cb)
  }
}
