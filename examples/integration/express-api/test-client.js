#!/usr/bin/env node

/**
 * VRF API Test Client
 *
 * This script tests all endpoints of the VRF Express API server.
 *
 * Run the server first: node server.js
 * Then run this client: node test-client.js
 */

const http = require('http')
const WebSocket = require('ws')
const { VrfSigner } = require('../../utils/vrf-helpers')

const API_BASE = 'http://localhost:3000/api'
const WS_URL = 'ws://localhost:3000'

// Test client VRF signer
const testSigner = new VrfSigner('test-client-seed-123')

console.log('=== VRF API Test Client ===\n')
console.log(`🔑 Test client public key: ${testSigner.getPublicKey().substring(0, 32)}...\n`)

/**
 * HTTP request helper
 */
async function request(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE)
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    }

    const req = http.request(url, options, (res) => {
      let body = ''
      res.on('data', (chunk) => (body += chunk))
      res.on('end', () => {
        try {
          const response = {
            status: res.statusCode,
            headers: res.headers,
            data: body ? JSON.parse(body) : null,
          }
          resolve(response)
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`))
        }
      })
    })

    req.on('error', reject)

    if (data) {
      req.write(JSON.stringify(data))
    }

    req.end()
  })
}

/**
 * Test runner
 */
class ApiTester {
  constructor() {
    this.results = []
  }

  async test(name, testFn) {
    console.log(`🧪 Testing: ${name}`)

    try {
      const result = await testFn()
      this.results.push({ name, success: true, result })
      console.log(`✅ ${name}: PASSED`)
      return result
    } catch (error) {
      this.results.push({ name, success: false, error: error.message })
      console.log(`❌ ${name}: FAILED - ${error.message}`)
      throw error
    }
  }

  printSummary() {
    const passed = this.results.filter((r) => r.success).length
    const total = this.results.length

    console.log(`\n=== Test Summary ===`)
    console.log(`Passed: ${passed}/${total}`)
    console.log(`Failed: ${total - passed}/${total}`)

    if (total > 0) {
      const failedTests = this.results.filter((r) => !r.success)
      if (failedTests.length > 0) {
        console.log('\nFailed tests:')
        failedTests.forEach((test) => {
          console.log(`  - ${test.name}: ${test.error}`)
        })
      }
    }
  }
}

/**
 * Main test suite
 */
async function runTests() {
  const tester = new ApiTester()

  try {
    // Test 1: Health check
    await tester.test('Health Check', async () => {
      const response = await request('GET', '/health')
      if (response.status !== 200) {
        throw new Error(`Expected 200, got ${response.status}`)
      }
      if (response.data.status !== 'healthy') {
        throw new Error('Server not healthy')
      }
      return response.data
    })

    // Test 2: API info
    await tester.test('API Info', async () => {
      const response = await request('GET', '/info')
      if (response.status !== 200) {
        throw new Error(`Expected 200, got ${response.status}`)
      }
      if (!response.data.endpoints) {
        throw new Error('No endpoints information')
      }
      return response.data
    })

    // Test 3: Sign message
    const signResult = await tester.test('Sign Message', async () => {
      const response = await request('POST', '/sign', {
        message: 'Hello, VRF API!',
        auxData: 'test-context',
      })
      if (response.status !== 200) {
        throw new Error(`Expected 200, got ${response.status}`)
      }
      if (!response.data.signature || !response.data.id) {
        throw new Error('Missing signature or ID')
      }
      return response.data
    })

    // Test 4: Verify signature
    await tester.test('Verify Signature', async () => {
      const response = await request('POST', '/verify', {
        signature: signResult.signature,
      })
      if (response.status !== 200) {
        throw new Error(`Expected 200, got ${response.status}`)
      }
      if (!response.data.valid) {
        throw new Error('Signature verification failed')
      }
      return response.data
    })

    // Test 5: Batch sign
    const batchResult = await tester.test('Batch Sign', async () => {
      const response = await request('POST', '/batch/sign', {
        messages: ['message-1', 'message-2', 'message-3'],
        auxDataFunction: true,
      })
      if (response.status !== 200) {
        throw new Error(`Expected 200, got ${response.status}`)
      }
      if (response.data.count !== 3) {
        throw new Error('Incorrect batch count')
      }
      return response.data
    })

    // Test 6: Generate random value
    await tester.test('Generate Random', async () => {
      const response = await request('GET', '/random/test-input-123?auxData=test-aux')
      if (response.status !== 200) {
        throw new Error(`Expected 200, got ${response.status}`)
      }
      if (!response.data.randomValue) {
        throw new Error('No random value generated')
      }
      return response.data
    })

    // Test 7: Current beacon
    const beaconResult = await tester.test('Current Beacon', async () => {
      const response = await request('GET', '/beacon/current')
      if (response.status !== 200) {
        throw new Error(`Expected 200, got ${response.status}`)
      }
      if (!response.data.beacon || !response.data.beacon.randomness) {
        throw new Error('No beacon data')
      }
      return response.data
    })

    // Test 8: Beacon history
    await tester.test('Beacon History', async () => {
      const response = await request('GET', '/beacon/history?limit=5')
      if (response.status !== 200) {
        throw new Error(`Expected 200, got ${response.status}`)
      }
      if (!Array.isArray(response.data.beacons)) {
        throw new Error('No beacon history')
      }
      return response.data
    })

    // Test 9: Authentication challenge
    const challengeResult = await tester.test('Auth Challenge', async () => {
      const response = await request('POST', '/auth/challenge')
      if (response.status !== 200) {
        throw new Error(`Expected 200, got ${response.status}`)
      }
      if (!response.data.challenge) {
        throw new Error('No challenge received')
      }
      return response.data
    })

    // Test 10: Authentication verification
    await tester.test('Auth Verification', async () => {
      const challenge = challengeResult.challenge
      const signature = testSigner.sign(challenge)

      const response = await request('POST', '/auth/verify', {
        challenge,
        signature,
      })
      if (response.status !== 200) {
        throw new Error(`Expected 200, got ${response.status}`)
      }
      if (!response.data.authenticated) {
        throw new Error('Authentication failed')
      }
      return response.data
    })

    // Test 11: Statistics
    await tester.test('Statistics', async () => {
      const response = await request('GET', '/stats')
      if (response.status !== 200) {
        throw new Error(`Expected 200, got ${response.status}`)
      }
      if (!response.data.server || !response.data.vrf) {
        throw new Error('Missing statistics data')
      }
      return response.data
    })

    // Test 12: Retrieve stored signature
    await tester.test('Retrieve Signature', async () => {
      const response = await request('GET', `/signature/${signResult.id}`)
      if (response.status !== 200) {
        throw new Error(`Expected 200, got ${response.status}`)
      }
      if (response.data.id !== signResult.id) {
        throw new Error('Signature ID mismatch')
      }
      return response.data
    })

    // Test 13: Error handling - invalid endpoint
    await tester.test('404 Error Handling', async () => {
      const response = await request('GET', '/nonexistent')
      if (response.status !== 404) {
        throw new Error(`Expected 404, got ${response.status}`)
      }
      return response.data
    })

    // Test 14: Error handling - invalid data
    await tester.test('400 Error Handling', async () => {
      const response = await request('POST', '/sign', {
        /* missing message */
      })
      if (response.status !== 400) {
        throw new Error(`Expected 400, got ${response.status}`)
      }
      return response.data
    })

    // Test 15: WebSocket connection
    await tester.test('WebSocket Connection', () => {
      return new Promise((resolve, reject) => {
        const ws = new WebSocket(WS_URL)
        let welcomeReceived = false

        const timeout = setTimeout(() => {
          ws.close()
          reject(new Error('WebSocket timeout'))
        }, 5000)

        ws.on('open', () => {
          ws.send(
            JSON.stringify({
              type: 'subscribe',
              topic: 'beacons',
            }),
          )
        })

        ws.on('message', (data) => {
          try {
            const message = JSON.parse(data)

            if (message.type === 'welcome') {
              welcomeReceived = true
            }

            if (message.type === 'subscribed' && welcomeReceived) {
              clearTimeout(timeout)
              ws.close()
              resolve({ connected: true, subscribed: true })
            }
          } catch (error) {
            clearTimeout(timeout)
            ws.close()
            reject(new Error('Invalid WebSocket message'))
          }
        })

        ws.on('error', (error) => {
          clearTimeout(timeout)
          reject(error)
        })
      })
    })

    console.log('\n🎉 All tests completed!')
  } catch (error) {
    console.log('\n💥 Test suite failed:', error.message)
  } finally {
    tester.printSummary()
  }
}

/**
 * Performance test
 */
async function performanceTest() {
  console.log('\n=== Performance Test ===\n')

  const iterations = 50
  const startTime = Date.now()

  console.log(`Running ${iterations} sign operations...`)

  for (let i = 0; i < iterations; i++) {
    try {
      await request('POST', '/sign', {
        message: `performance-test-${i}`,
        auxData: `iteration-${i}`,
      })

      if ((i + 1) % 10 === 0) {
        process.stdout.write(`\rProgress: ${i + 1}/${iterations}`)
      }
    } catch (error) {
      console.error(`\nError at iteration ${i}:`, error.message)
      break
    }
  }

  const duration = Date.now() - startTime
  const opsPerSecond = ((iterations / duration) * 1000).toFixed(2)

  console.log(`\n\nPerformance results:`)
  console.log(`• Total time: ${duration}ms`)
  console.log(`• Operations per second: ${opsPerSecond}`)
  console.log(`• Average time per operation: ${(duration / iterations).toFixed(2)}ms`)
}

/**
 * Load test
 */
async function loadTest() {
  console.log('\n=== Load Test ===\n')

  const concurrent = 10
  const operationsPerWorker = 5

  console.log(`Running ${concurrent} concurrent workers with ${operationsPerWorker} operations each...`)

  const workers = []
  const startTime = Date.now()

  for (let i = 0; i < concurrent; i++) {
    workers.push(
      (async (workerId) => {
        const results = []
        for (let j = 0; j < operationsPerWorker; j++) {
          try {
            const response = await request('POST', '/sign', {
              message: `load-test-worker-${workerId}-op-${j}`,
            })
            results.push({ success: true, status: response.status })
          } catch (error) {
            results.push({ success: false, error: error.message })
          }
        }
        return results
      })(i),
    )
  }

  const allResults = await Promise.all(workers)
  const duration = Date.now() - startTime

  const flatResults = allResults.flat()
  const successful = flatResults.filter((r) => r.success).length
  const failed = flatResults.length - successful

  console.log(`\nLoad test results:`)
  console.log(`• Total operations: ${flatResults.length}`)
  console.log(`• Successful: ${successful}`)
  console.log(`• Failed: ${failed}`)
  console.log(`• Duration: ${duration}ms`)
  console.log(`• Throughput: ${((flatResults.length / duration) * 1000).toFixed(2)} ops/sec`)
}

// Run tests
if (require.main === module) {
  ;(async () => {
    try {
      await runTests()

      if (process.argv.includes('--performance')) {
        await performanceTest()
      }

      if (process.argv.includes('--load')) {
        await loadTest()
      }
    } catch (error) {
      console.error('Test runner failed:', error)
      process.exit(1)
    }
  })()
}

module.exports = { request, ApiTester }
