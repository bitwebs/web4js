const test = require('tape')
const createNative = require('./lib/native')
const createBitspace = require('./lib/bitspace')
const createMixed = require('./lib/mixed')

let cleanups = []

async function cleanupTests () {
  console.log('# [test] cleaning up previous run')
  while (cleanups.length > 0) {
    await cleanups.shift()()
  }
}

function runOnFirstCall (init) {
  let result
  return () => {
    if (!result) {
      result = init()
    }
    return result
  }
}

test.onFinish(cleanupTests)
run(createNative, 'native')
run(createBitspace, 'bitspace')
run(createMixed, 'mixed')

function run (createTestSDKs, name) {
  const init = runOnFirstCall(async () => {
    await cleanupTests()
    console.log(`# [test/${name}] init start`)
    const { sdks, cleanup } = await createTestSDKs(2)
    const { Bitdrive, Unichain, resolveName, close } = sdks[0]
    const { Bitdrive: Bitdrive2, Unichain: Unichain2, close: close2 } = sdks[1]
    cleanups.push(async () => {
      await Promise.all([
        close(),
        close2()
      ])
      await cleanup()
    })
    console.log(`# [test/${name}] init end`)
    return {
      Bitdrive,
      Unichain,
      resolveName,
      Bitdrive2,
      Unichain2
    }
  })

  const TEST_TIMEOUT = 60 * 1000 * 2

  const EXAMPLE_DNS_URL = 'bit://social.x'
  const EXAMPLE_DNS_RESOLUTION = '60c525b5589a5099aa3610a8ee550dcd454c3e118f7ac93b7d41b6b850272330'

  test(name + ': Bitdrive - create drive', async t => {
    t.timeoutAfter(TEST_TIMEOUT)
    const { Bitdrive } = await init()

    const drive = Bitdrive('Example drive 1')

    await drive.writeFile('/example.txt', 'Hello World!')
    t.pass('Able to write to bitdrive')
  })

  test(name + ': Bitdrive - get existing drive', async t => {
    const { Bitdrive } = await init()

    const drive = Bitdrive('Example drive 2')
    await drive.ready()

    const existing = Bitdrive(drive.key)

    t.equal(existing, drive, 'Got existing drive by reference')
  })

  test(name + ': Bitdrive - load drive over network', async t => {
    t.timeoutAfter(TEST_TIMEOUT)

    const EXAMPLE_DATA = 'Hello World!'

    const { Bitdrive2, Bitdrive } = await init()

    const drive1 = Bitdrive2('Example drive 3')
    await drive1.writeFile('/index.html', EXAMPLE_DATA)
    const drive = Bitdrive(drive1.key)
    t.deepEqual(drive1.key, drive.key, 'loaded correct drive')
    await new Promise(resolve => drive.once('peer-open', resolve))
    t.pass('Got peer for drive')
    t.equal(
      await drive.readFile('/index.html', 'utf8'),
      EXAMPLE_DATA
    )
  })

  test(name + ': Bitdrive - new drive created after close', async t => {
    const { Bitdrive } = await init()
    const drive = Bitdrive('Example drive 5')

    await drive.ready()
    await drive.close()

    const existing = Bitdrive(drive.key)

    t.notOk(existing === drive, 'Got new drive by reference')
  })

  test(name + ': resolveName - resolve and load drive', async t => {
    const { resolveName } = await init()
    t.timeoutAfter(TEST_TIMEOUT)

    t.equal(
      await new Promise((resolve, reject) => resolveName(EXAMPLE_DNS_URL, (err, data) => err ? reject(err) : resolve(data))),
      EXAMPLE_DNS_RESOLUTION
    )
  })

  test(name + ': Unichain - create', async t => {
    t.timeoutAfter(TEST_TIMEOUT)

    const { Unichain } = await init()
    const chain = Unichain('Example unichain 1')
    await chain.append('Hello World')
  })

  test(name + ': Unichain - load from network', async t => {
    t.timeoutAfter(TEST_TIMEOUT)
    t.plan(2)

    const { Unichain, Unichain2 } = await init()

    const chain1 = Unichain('Example unichain 2')
    await chain1.append('Hello World')
    const chain2 = Unichain2(chain1.key)
    await chain2.ready()
    t.deepEqual(chain2.key, chain1.key, 'loaded key correctly')
    await new Promise(resolve => chain2.once('peer-open', resolve))
    t.ok(
      await chain2.get(0),
      'got data from replicated chain'
    )
  })

  test(name + ': Unichain - only close when all handles are closed', async t => {
    t.timeoutAfter(TEST_TIMEOUT)
    t.plan(5)

    const { Unichain } = await init()

    const chain1 = Unichain('Example unichain 4')
    const chain2 = Unichain('Example unichain 4')

    chain1.once('close', () => t.pass('close event emitted once'))

    t.ok(chain1 === chain2, 'Second handle is same instance')

    await chain1.append('Hello World')
    await chain1.close()
    t.pass('First chain closed')
    t.ok(
      await chain1.get(0),
      'Still able to read after close'
    )
    await chain2.close()
    t.pass('Second chain closed')
  })
}
