const SDK = require('../')
// const SDK = require('web4js')

run()

async function run () {
  const sdk = await SDK()
  const {
    Unichain,
    Bitdrive,
    resolveName,
    close // <-- Make sure to call this when you're done
  } = sdk

  // Create a new Bitdrive.
  // If you want to create a new archive, pass in a name for it
  // This will be used to derive a secret key
  // Every time you open a drive with that name it'll derive the same key
  // This uses a master key that's generated once per device
  // That means the same name will yield a different key on a different machine
  const archive = Bitdrive('My archive name', {
  // This archive will disappear after the process exits
  // This is here so that running the example doesn't clog up your history
    persist: false,
    // storage can be set to an instance of `random-access-*`
    // const RAI = require('random-access-idb')
    // otherwise it defaults to `random-access-web` in the browser
    // and `random-access-file` in node
    storage: null // storage: RAI
  })

  // You should wait for the archive to be totally initialized
  await archive.ready()

  const url = `bit://${archive.key.toString('hex')}`

  // TODO: Save this for later!
  console.log(`Here's your URL: ${url}`)

  // Check out the bitdrive docs for what you can do with it
  // https://www.npmjs.com/package/@web4/bitdrive#api
  await archive.writeFile('/example.txt', 'Hello World!')
  console.log('Written example file!')
  const key = await resolveName('bit://social.x')

  console.log('Resolved key', key)

  const SOME_URL = 'bit://0a9e202b8055721bd2bc93b3c9bbc03efdbda9cfee91f01a123fdeaadeba303e/'

  const someArchive = Bitdrive(SOME_URL)

  console.log(await someArchive.readdir('/'))

  // Create a unichain
  // Check out the unichain docs for what you can do with it
  // https://github.com/bitwebs/unichain
  const myChain = Unichain('my unichain name', {
    valueEncoding: 'json',
    persist: false,
    // storage can be set to an instance of `random-access-*`
    // const RAI = require('random-access-idb')
    // otherwise it defaults to `random-access-web` in the browser
    // and `random-access-file` in node
    storage: null // storage: RAI
  })

  // Add some data to it
  await myChain.append(JSON.stringify({
    name: 'Alice'
  }))

  // Use extension messages for sending extra data over the p2p connection
  const discoveryChainKey = 'dat://bee80ff3a4ee5e727dc44197cb9d25bf8f19d50b0f3ad2984cfe5b7d14e75de7'
  const discoveryChain = new Unichain(discoveryChainKey)

  // Register the extension message handler
  const extension = discoveryChain.registerExtension('discovery', {
    // Set the encoding type for messages
    encoding: 'binary',
    onmessage: (message, peer) => {
      // Recieved messages will be automatically decoded
      console.log('Got key from peer!', message)

      const otherChain = new Unichain(message, {
        valueEncoding: 'json',
        persist: false
      })

      // Render the peer's data from their chain
      otherChain.get(0, console.log)
    }
  })

  // When you find a peer tell them about your chain
  discoveryChain.on('peer-add', (peer) => {
    console.log('Got a peer!')
    extension.send(myChain.key, peer)
  })

  const bittrie = require('@web4/bittrie')

  // Pass in unichains from the SDK into other dat data structures
  // Check out what you can do with bittrie from there:
  // https://github.com/bitwebs/bittrie
  const trie = bittrie(null, {
    feed: new Unichain('my trie chain', {
      persist: false
    })
  })

  trie.put('key', 'value', () => {
    trie.get('key', (err, node) => {
      console.log(err)
      console.log('Got key: ', node.key)
      console.log('Loaded value from trie: ', node.value)

      close()
    })
  })
}
