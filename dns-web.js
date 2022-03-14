/* global fetch */
// TODO: Persist to local storage

const DEFAULT_DNS_PROXY = 'proxy.bitdht.com'
const NEWLINE_REGEX = /\r?\n/
const BIT_PROTOCOL = 'bit://'

module.exports = ({
  dnsProxy = DEFAULT_DNS_PROXY
} = {}) => {
  let cache = {}

  return {
    async resolveName (url, opts, cb) {
      if (typeof opts === 'function') {
        cb = opts
        opts = {}
      }
      if (!cb) cb = noop

      let domain = url

      if (domain.startsWith(BIT_PROTOCOL)) {
        domain = url.slice(BIT_PROTOCOL.length)
      }

      if (cache[domain]) {
        if (cb) {
          cb(null, cache[domain])
          return
        } else {
          return cache[domain]
        }
      }

      try {
        const toFetch = `//${dnsProxy}/${domain}/.well-known/bit`

        const response = await fetch(toFetch)

        const text = await response.text()

        const lines = text.split(NEWLINE_REGEX)

        const resolved = lines[0]

        const key = resolved.slice(BIT_PROTOCOL.length)

        cache[domain] = key

        if (cb) cb(null, key)
      } catch (e) {
        if (cb) cb(e)
        else throw e
      }
    },
    listCache () {
      return cache
    },
    flushCache () {
      cache = {}
    }
  }
}

function noop () {}
