const path = require('path')

// This is a dirty hack for browserify to work. 😅
if (!path.posix) path.posix = path

const BitEncoding = require('@web4/encoding')
const bitDNS = require('@web4/bitweb-dns')
const bitdrive = require('@web4/bitdrive')
const makeUnichainPromise = require('@web4/unichain-promise')
const makeBitdrivePromise = require('@web4/bitdrive-promise')

const DEFAULT_DRIVE_OPTS = {
  sparse: true,
  persist: true
}
const DEFAULT_CHAIN_OPTS = {
  sparse: true,
  persist: true
}
const DEFAULT_DNS_OPTS = {}
const DEFAULT_APPLICATION_NAME = 'web4js'

const CLOSE_FN = Symbol('close')
const HANDLE_COUNT = Symbol('closeCount')

module.exports = SDK
module.exports.DEFAULT_APPLICATION_NAME = DEFAULT_APPLICATION_NAME

async function SDK (opts = {}) {
  if (!opts.backend) throw new Error('No backend was passed in')

  if (!opts.applicationName) {
    opts.applicationName = DEFAULT_APPLICATION_NAME
  }
  if (opts.persist === undefined) {
    opts.persist = true
  }

  const {
    backend,
    driveOpts,
    chainOpts,
    dnsOpts
  } = opts

  const dns = bitDNS(Object.assign({}, DEFAULT_DNS_OPTS, dnsOpts))

  const handlers = await backend(opts)
  const {
    storage,
    chainstore,
    swarm,
    deriveSecret,
    keyPair
  } = handlers

  await chainstore.ready()

  const drives = new Map()
  const chains = new Map()

  return {
    Bitdrive,
    Unichain,
    resolveName,
    getIdentity,
    deriveSecret,
    registerExtension,
    close,
    get keyPair () { return keyPair },
    _storage: storage,
    _chainstore: chainstore,
    _swarm: swarm,
    _dns: dns
  }

  function getIdentity () {
    console.warn('getIdentity is being deprecated and will be removed in version 2.x.x, please use sdk.keyPair instead')
    return keyPair
  }

  function close (cb) {
    const process = _close()
    if (!cb) {
      return process
    }
    process.then(() => cb(), cb)
  }

  async function _close () {
    await Promise.all(
      []
        .concat(Array.from(drives.values()).map(drive => drive.close()))
        .concat(Array.from(chains.values()).map(chain => chain.close()))
    )
    if (handlers.close) {
      await new Promise(
        (resolve, reject) =>
          handlers.close(error => { error ? reject(error): resolve() })
      )
    }
  }

  function resolveName (url, cb) {
    return dns.resolveName(url, cb)
  }

  function registerExtension (name, handlers) {
    return swarm.registerExtension(name, handlers)
  }

  function Bitdrive (nameOrKey, opts) {
    if (!nameOrKey) throw new Error('Must give a name or key in the constructor')

    opts = Object.assign({}, DEFAULT_DRIVE_OPTS, driveOpts, opts)

    const { key, name, id } = resolveNameOrKey(nameOrKey)

    if (drives.has(id)) {
      const existing = drives.get(id)
      existing[HANDLE_COUNT]++
      return existing
    }

    if (name) opts.namespace = name

    const drive = bitdrive(chainstore, key, opts)
    const wrappedDrive = makeBitdrivePromise(drive)

    drive[HANDLE_COUNT] = 0

    drive[CLOSE_FN] = drive.close
    drive.close = function (fd, cb) {
      if (fd && cb) return this[CLOSE_FN](fd, cb)
      const hasHandles = wrappedDrive[HANDLE_COUNT]--
      if (hasHandles > 0) setTimeout(fd, 0)
      else setTimeout(() => this[CLOSE_FN](fd, cb), 0)
    }

    drives.set(id, wrappedDrive)

    if (!key) {
      drive.ready(() => {
        const key = drive.key
        const stringKey = key.toString('hex')
        drives.set(stringKey, wrappedDrive)
      })
    }

    drive.ready(() => {
      const {
        discoveryKey = drive.discoveryKey,
        lookup = true,
        announce = true
      } = opts
      // Don't advertise if we're not looking up or announcing
      if (!lookup && !announce) return
      swarm.configure(discoveryKey, { lookup, announce })
    })

    drive.once('close', () => {
      const key = drive.key
      const stringKey = key.toString('hex')

      drives.delete(stringKey)
      drives.delete(id)

      const { discoveryKey = drive.discoveryKey } = opts
      swarm.configure(discoveryKey, { announce: false, lookup: false })
    })

    return wrappedDrive
  }

  function Unichain (nameOrKey, opts) {
    if (!nameOrKey) throw new Error('Must give a name or key in the constructor')

    opts = Object.assign({}, DEFAULT_CHAIN_OPTS, chainOpts, opts)

    const { key, name, id } = resolveNameOrKey(nameOrKey)

    if (chains.has(id)) {
      const existing = chains.get(id)
      existing[HANDLE_COUNT]++
      return existing
    }

    let chain
    if (key) {
      // If a bitweb key was provided, get it from the chainstore
      chain = chainstore.get({ ...opts, key })
    } else {
      // If no bitweb key was provided, but a name was given, use it as a namespace
      chain = chainstore.namespace(name).default(opts)
    }

    // Wrap with promises
    const wrappedChain = makeUnichainPromise(chain)

    chain[HANDLE_COUNT] = 0

    chain.close = function (cb) {
      if (!cb) cb = function noop () {}
      const hasHandles = wrappedChain[HANDLE_COUNT]--
      if (hasHandles === 0) {
        setTimeout(() => {
          let promise = chain._close(cb)
          if (promise && promise.then) promise.then(cb, cb)
        }, 0)
      } else if (cb) setTimeout(cb, 0)
    }

    chains.set(id, wrappedChain)

    if (!key) {
      chain.ready(() => {
        const key = chain.key
        const stringKey = key.toString('hex')
        chains.set(stringKey, wrappedChain)
      })
    }

    chain.ready(() => {
      const {
        discoveryKey = chain.discoveryKey,
        lookup = true,
        announce = true
      } = opts

      // Don't advertise if we're not looking up or announcing
      if (!lookup && !announce) return
      swarm.configure(discoveryKey, { announce, lookup })
    })

    chain.once('close', () => {
      const { discoveryKey = chain.discoveryKey } = opts
      const key = chain.key
      const stringKey = key.toString('hex')

      swarm.configure(discoveryKey, { announce: false, lookup: false })

      chains.delete(stringKey)
      chains.delete(id)
    })

    return wrappedChain
  }

  function resolveNameOrKey (nameOrKey) {
    let key, name, id
    try {
      key = BitEncoding.decode(nameOrKey)
      id = key.toString('hex')
      // Normalize keys to be hex strings of the key instead of bit URLs
    } catch (e) {
      // Probably isn't a `bit://` URL, so it must be a name
      name = nameOrKey
      id = name
    }
    return { key, name, id }
  }
}
