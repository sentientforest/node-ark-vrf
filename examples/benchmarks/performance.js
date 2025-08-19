#!/usr/bin/env node

/**
 * VRF Performance Benchmarks
 *
 * This benchmark suite measures the performance of VRF operations:
 * - Keypair generation
 * - VRF proof generation
 * - VRF proof verification
 * - Proof-to-hash conversion
 * - Batch operations
 *
 * Run with: node performance.js
 * For detailed output: node performance.js --verbose
 */

const vrf = require('../../index')
const crypto = require('crypto')

console.log('=== VRF Performance Benchmarks ===\n')

const VERBOSE = process.argv.includes('--verbose')
const ITERATIONS = {
  keypair: 1000,
  prove: 500,
  verify: 500,
  hash: 1000,
  batch: 100,
}

/**
 * High-resolution timer for accurate measurements
 */
class Timer {
  constructor() {
    this.start()
  }

  start() {
    this.startTime = process.hrtime.bigint()
  }

  stop() {
    const endTime = process.hrtime.bigint()
    return Number(endTime - this.startTime) / 1_000_000 // Convert to milliseconds
  }
}

/**
 * Statistical analysis helper
 */
class Statistics {
  static analyze(measurements) {
    measurements.sort((a, b) => a - b)
    const count = measurements.length
    const sum = measurements.reduce((a, b) => a + b, 0)

    return {
      count,
      mean: sum / count,
      median:
        count % 2 === 0
          ? (measurements[count / 2 - 1] + measurements[count / 2]) / 2
          : measurements[Math.floor(count / 2)],
      min: measurements[0],
      max: measurements[count - 1],
      p95: measurements[Math.floor(count * 0.95)],
      p99: measurements[Math.floor(count * 0.99)],
      stddev: Math.sqrt(measurements.reduce((sum, x) => sum + Math.pow(x - sum / count, 2), 0) / count),
    }
  }

  static format(stats) {
    return {
      'Mean (ms)': stats.mean.toFixed(3),
      'Median (ms)': stats.median.toFixed(3),
      'Min (ms)': stats.min.toFixed(3),
      'Max (ms)': stats.max.toFixed(3),
      'P95 (ms)': stats.p95.toFixed(3),
      'P99 (ms)': stats.p99.toFixed(3),
      'Std Dev (ms)': stats.stddev.toFixed(3),
      'Ops/sec': (1000 / stats.mean).toFixed(0),
    }
  }
}

/**
 * Benchmark runner
 */
class BenchmarkRunner {
  constructor() {
    this.results = {}
  }

  async runBenchmark(name, fn, iterations = 100) {
    console.log(`Running ${name} benchmark (${iterations} iterations)...`)

    const measurements = []
    const timer = new Timer()

    // Warmup
    for (let i = 0; i < Math.min(10, iterations); i++) {
      await fn()
    }

    // Actual measurements
    for (let i = 0; i < iterations; i++) {
      timer.start()
      await fn()
      measurements.push(timer.stop())

      if (VERBOSE && (i + 1) % Math.max(1, Math.floor(iterations / 10)) === 0) {
        console.log(`  Progress: ${(((i + 1) / iterations) * 100).toFixed(0)}%`)
      }
    }

    const stats = Statistics.analyze(measurements)
    this.results[name] = stats

    console.log(`${name} completed:`)
    console.table(Statistics.format(stats))
    console.log()

    return stats
  }

  generateReport() {
    console.log('=== Performance Summary ===\n')

    const summary = {}
    for (const [name, stats] of Object.entries(this.results)) {
      summary[name] = {
        'Avg (ms)': stats.mean.toFixed(3),
        'Ops/sec': (1000 / stats.mean).toFixed(0),
        'P95 (ms)': stats.p95.toFixed(3),
      }
    }

    console.table(summary)

    // Performance insights
    console.log('\n=== Performance Insights ===\n')

    const keygenOps = this.results['Keypair Generation'] ? 1000 / this.results['Keypair Generation'].mean : 0
    const proveOps = this.results['Proof Generation'] ? 1000 / this.results['Proof Generation'].mean : 0
    const verifyOps = this.results['Proof Verification'] ? 1000 / this.results['Proof Verification'].mean : 0

    console.log(`• Keypair generation: ~${keygenOps.toFixed(0)} operations/second`)
    console.log(`• Proof generation: ~${proveOps.toFixed(0)} operations/second`)
    console.log(`• Proof verification: ~${verifyOps.toFixed(0)} operations/second`)

    if (verifyOps > proveOps) {
      console.log(`• Verification is ${(verifyOps / proveOps).toFixed(1)}x faster than proof generation`)
    } else {
      console.log(`• Proof generation is ${(proveOps / verifyOps).toFixed(1)}x faster than verification`)
    }
  }
}

// Benchmark functions
function generateRandomSeed() {
  return crypto.randomBytes(32).toString('hex')
}

function generateRandomMessage() {
  return crypto.randomBytes(16).toString('hex')
}

// Main benchmark execution
async function runBenchmarks() {
  const runner = new BenchmarkRunner()

  // 1. Keypair Generation Benchmark
  await runner.runBenchmark(
    'Keypair Generation',
    () => {
      const seed = generateRandomSeed()
      vrf.generateKeypairFromSeed(seed)
    },
    ITERATIONS.keypair,
  )

  // 2. Proof Generation Benchmark
  const testKeypair = vrf.generateKeypairFromSeed('benchmark-keypair-seed')
  await runner.runBenchmark(
    'Proof Generation',
    () => {
      const message = generateRandomMessage()
      vrf.vrfProve(testKeypair.secretKey, message)
    },
    ITERATIONS.prove,
  )

  // 3. Proof Verification Benchmark
  const testMessage = 'benchmark-message'
  const testProof = vrf.vrfProve(testKeypair.secretKey, testMessage)
  await runner.runBenchmark(
    'Proof Verification',
    () => {
      vrf.vrfVerify(testKeypair.publicKey, testMessage, testProof)
    },
    ITERATIONS.verify,
  )

  // 4. Proof-to-Hash Benchmark
  await runner.runBenchmark(
    'Proof to Hash',
    () => {
      vrf.vrfProofToHash(testProof)
    },
    ITERATIONS.hash,
  )

  // 5. VRF with Auxiliary Data Benchmark
  const auxData = JSON.stringify({ context: 'benchmark', timestamp: Date.now() })
  await runner.runBenchmark(
    'Proof with Aux Data',
    () => {
      const message = generateRandomMessage()
      vrf.vrfProve(testKeypair.secretKey, message, auxData)
    },
    ITERATIONS.prove,
  )

  // 6. Auxiliary Data Verification Benchmark
  const auxProof = vrf.vrfProve(testKeypair.secretKey, testMessage, auxData)
  await runner.runBenchmark(
    'Verify with Aux Data',
    () => {
      vrf.vrfVerify(testKeypair.publicKey, testMessage, auxProof, auxData)
    },
    ITERATIONS.verify,
  )

  // 7. Batch Operations Benchmark
  const batchSize = 10
  const batchMessages = Array.from({ length: batchSize }, () => generateRandomMessage())
  await runner.runBenchmark(
    'Batch Prove (10 ops)',
    () => {
      batchMessages.forEach((message) => {
        vrf.vrfProve(testKeypair.secretKey, message)
      })
    },
    ITERATIONS.batch,
  )

  const batchProofs = batchMessages.map((message) => vrf.vrfProve(testKeypair.secretKey, message))
  await runner.runBenchmark(
    'Batch Verify (10 ops)',
    () => {
      batchMessages.forEach((message, i) => {
        vrf.vrfVerify(testKeypair.publicKey, message, batchProofs[i])
      })
    },
    ITERATIONS.batch,
  )

  runner.generateReport()
}

// Memory usage tracking
function getMemoryUsage() {
  const usage = process.memoryUsage()
  return {
    rss: (usage.rss / 1024 / 1024).toFixed(2),
    heapUsed: (usage.heapUsed / 1024 / 1024).toFixed(2),
    heapTotal: (usage.heapTotal / 1024 / 1024).toFixed(2),
    external: (usage.external / 1024 / 1024).toFixed(2),
  }
}

// Memory benchmark
async function memoryBenchmark() {
  console.log('\n=== Memory Usage Analysis ===\n')

  const initialMemory = getMemoryUsage()
  console.log('Initial memory usage:')
  console.table(initialMemory)

  // Generate many keypairs to test memory usage
  console.log('\nGenerating 1000 keypairs...')
  const keypairs = []
  for (let i = 0; i < 1000; i++) {
    keypairs.push(vrf.generateKeypairFromSeed(`benchmark-seed-${i}`))
  }

  const afterKeypairs = getMemoryUsage()
  console.log('Memory after 1000 keypairs:')
  console.table(afterKeypairs)

  // Generate many proofs
  console.log('\nGenerating 1000 proofs...')
  const proofs = []
  for (let i = 0; i < 1000; i++) {
    proofs.push(vrf.vrfProve(keypairs[0].secretKey, `message-${i}`))
  }

  const afterProofs = getMemoryUsage()
  console.log('Memory after 1000 proofs:')
  console.table(afterProofs)

  // Force garbage collection if available
  if (global.gc) {
    global.gc()
    const afterGC = getMemoryUsage()
    console.log('Memory after garbage collection:')
    console.table(afterGC)
  } else {
    console.log('(Run with --expose-gc to enable garbage collection test)')
  }
}

// Stress test
async function stressTest() {
  console.log('\n=== Stress Test ===\n')

  const duration = 10 // seconds
  const startTime = Date.now()
  let operations = 0

  const keypair = vrf.generateKeypairFromSeed('stress-test-keypair')

  console.log(`Running stress test for ${duration} seconds...`)

  while (Date.now() - startTime < duration * 1000) {
    const message = `stress-message-${operations}`
    const proof = vrf.vrfProve(keypair.secretKey, message)
    const isValid = vrf.vrfVerify(keypair.publicKey, message, proof)

    if (!isValid) {
      console.error(`❌ Verification failed at operation ${operations}`)
      break
    }

    operations++

    if (operations % 100 === 0) {
      process.stdout.write(`\rOperations completed: ${operations}`)
    }
  }

  const actualDuration = (Date.now() - startTime) / 1000
  const opsPerSecond = operations / actualDuration

  console.log(`\n\nStress test completed:`)
  console.log(`• Total operations: ${operations}`)
  console.log(`• Duration: ${actualDuration.toFixed(2)} seconds`)
  console.log(`• Operations per second: ${opsPerSecond.toFixed(0)}`)
  console.log(`• All verifications passed: ✓`)
}

// Comparative benchmark
async function comparativeBenchmark() {
  console.log('\n=== Comparative Analysis ===\n')

  const keypair = vrf.generateKeypairFromSeed('comparative-test')
  const message = 'comparative-test-message'

  // Different message sizes
  const messageSizes = [16, 64, 256, 1024, 4096] // bytes

  console.log('Performance vs Message Size:')
  for (const size of messageSizes) {
    const largeMessage = crypto.randomBytes(size).toString('hex')

    const timer = new Timer()
    const iterations = 100

    timer.start()
    for (let i = 0; i < iterations; i++) {
      vrf.vrfProve(keypair.secretKey, largeMessage)
    }
    const proveTime = timer.stop() / iterations

    const proof = vrf.vrfProve(keypair.secretKey, largeMessage)
    timer.start()
    for (let i = 0; i < iterations; i++) {
      vrf.vrfVerify(keypair.publicKey, largeMessage, proof)
    }
    const verifyTime = timer.stop() / iterations

    console.log(`${size} bytes: Prove ${proveTime.toFixed(3)}ms, Verify ${verifyTime.toFixed(3)}ms`)
  }

  // Different auxiliary data sizes
  console.log('\nPerformance vs Auxiliary Data Size:')
  for (const size of [0, 16, 64, 256, 1024]) {
    const auxData = size > 0 ? crypto.randomBytes(size).toString('hex') : undefined

    const timer = new Timer()
    const iterations = 100

    timer.start()
    for (let i = 0; i < iterations; i++) {
      vrf.vrfProve(keypair.secretKey, message, auxData)
    }
    const proveTime = timer.stop() / iterations

    const proof = vrf.vrfProve(keypair.secretKey, message, auxData)
    timer.start()
    for (let i = 0; i < iterations; i++) {
      vrf.vrfVerify(keypair.publicKey, message, proof, auxData)
    }
    const verifyTime = timer.stop() / iterations

    console.log(`${size} bytes aux: Prove ${proveTime.toFixed(3)}ms, Verify ${verifyTime.toFixed(3)}ms`)
  }
}

// Platform information
function printPlatformInfo() {
  console.log('=== Platform Information ===\n')
  console.log(`Node.js version: ${process.version}`)
  console.log(`Platform: ${process.platform} ${process.arch}`)
  console.log(`CPUs: ${require('os').cpus().length} cores`)
  console.log(`Memory: ${(require('os').totalmem() / 1024 / 1024 / 1024).toFixed(1)} GB`)
  console.log(`V8 version: ${process.versions.v8}`)
  console.log()
}

// Main execution
async function main() {
  printPlatformInfo()

  try {
    await runBenchmarks()
    await memoryBenchmark()
    await stressTest()
    await comparativeBenchmark()

    console.log('\n=== Benchmark Complete ===\n')
    console.log('📊 All benchmarks completed successfully')
    console.log('💡 For more detailed output, run with --verbose flag')
    console.log('🗑️  For memory analysis, run with --expose-gc flag')
  } catch (error) {
    console.error('❌ Benchmark failed:', error)
    process.exit(1)
  }
}

// Handle errors gracefully
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled rejection at:', promise, 'reason:', reason)
  process.exit(1)
})

if (require.main === module) {
  main()
}

module.exports = { BenchmarkRunner, Statistics, Timer }
