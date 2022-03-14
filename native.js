const SwarmNetworker = require('@web4/chainstore-networker')
const RAA = require('random-access-application')
const RAM = require('random-access-memory')
const BitProtocol = require('@web4/bit-protocol')
const Chainstore = require('@web4/chainstore')
const SDK = require('./sdk')

const DEFAULT_SWARM_OPTS = {
  extensions: [],
  preferredPort: 42666
}
const DEFAULT_CHAINSTORE_OPTS = {
  sparse: true
}

module.exports = async function createSDK (opts) {
  return SDK({ ...opts, backend: nativeBackend })
}
module.exports.createBackend = nativeBackend

async function nativeBackend (opts) {
  let {
    storage,
    chainstore,
    applicationName,
    persist,
    swarmOpts,
    chainstoreOpts
  } = opts
  // Derive storage if it isn't provided
  // Don't derive if chainstore was provided
  if (!storage && !chainstore) {
    if (persist !== false) {
      storage = RAA(applicationName)
    } else {
      // Nothing should be persisted. 🤷
      storage = RAM
    }
  }

  if (!chainstore) {
    chainstore = new Chainstore(
      storage,
      Object.assign({}, DEFAULT_CHAINSTORE_OPTS, chainstoreOpts)
    )
  }

  // The chainstore needs to be opened before creating the swarm.
  await chainstore.ready()

  // I think this is used to create a persisted identity?
  // Needs to be created before the swarm so that it can be passed in
  const noiseSeed = await deriveSecret(applicationName, 'replication-keypair')
  const keyPair = BitProtocol.keyPair(noiseSeed)

  const swarm = new SwarmNetworker(chainstore, Object.assign({ keyPair }, DEFAULT_SWARM_OPTS, swarmOpts))

  return {
    storage,
    chainstore,
    swarm,
    deriveSecret,
    keyPair,
    close
  }

  async function deriveSecret (namespace, name) {
    return chainstore.inner._deriveSecret(namespace, name)
  }

  function close (cb) {
    chainstore.close(() => {
      swarm.close().then(cb, cb)
    })
  }
}
