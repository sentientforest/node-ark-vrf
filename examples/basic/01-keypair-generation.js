#!/usr/bin/env node

/**
 * Basic Keypair Generation Example
 *
 * This example demonstrates:
 * - Generating VRF keypairs from seed strings
 * - Understanding the keypair structure
 * - Best practices for key management
 *
 * Run with: node 01-keypair-generation.js
 */

const vrf = require('../../index')

console.log('=== VRF Keypair Generation Example ===\n')

// Example 1: Generate keypair from a simple seed
console.log('1. Basic keypair generation:')
const seed1 = 'my-secret-seed-phrase'
const keypair1 = vrf.generateKeypairFromSeed(seed1)

console.log('Seed:', seed1)
console.log('Public Key (hex):', keypair1.publicKey)
console.log('Secret Key (hex):', keypair1.secretKey.substring(0, 32) + '...')
console.log('Key lengths:', {
  public: keypair1.publicKey.length,
  secret: keypair1.secretKey.length,
})

// Example 2: Deterministic generation
console.log('\n2. Deterministic generation (same seed = same keys):')
const keypair2 = vrf.generateKeypairFromSeed(seed1)
console.log('Keys match:', {
  publicMatch: keypair1.publicKey === keypair2.publicKey,
  secretMatch: keypair1.secretKey === keypair2.secretKey,
})

// Example 3: Different seeds produce different keys
console.log('\n3. Different seeds produce different keys:')
const seed3 = 'different-seed-phrase'
const keypair3 = vrf.generateKeypairFromSeed(seed3)
console.log('Different seed:', seed3)
console.log('Keys differ:', {
  publicDiffer: keypair1.publicKey !== keypair3.publicKey,
  secretDiffer: keypair1.secretKey !== keypair3.secretKey,
})

// Example 4: Using complex seeds
console.log('\n4. Complex seed example:')
const complexSeed = JSON.stringify({
  userId: 'user-123',
  timestamp: Date.now(),
  nonce: 'random-value-xyz',
})
const keypair4 = vrf.generateKeypairFromSeed(complexSeed)
console.log('Complex seed length:', complexSeed.length)
console.log('Public key generated:', keypair4.publicKey.substring(0, 32) + '...')

// Best practices
console.log('\n=== Best Practices ===\n')
console.log('1. NEVER hardcode seeds in production code')
console.log('2. Use environment variables or secure key management systems')
console.log('3. Store secret keys securely (encrypted at rest)')
console.log('4. Never expose secret keys in logs or error messages')
console.log('5. Use different keys for different purposes/contexts')
console.log('6. Consider key rotation strategies for long-lived systems')

// Example: Production-like key generation
console.log('\n5. Production-style example:')
if (process.env.VRF_SEED) {
  const prodKeypair = vrf.generateKeypairFromSeed(process.env.VRF_SEED)
  console.log('✓ Loaded keypair from environment variable')
  console.log('Public key:', prodKeypair.publicKey)
} else {
  console.log('ℹ Set VRF_SEED environment variable for production use')
  console.log('Example: VRF_SEED=your-secure-seed node 01-keypair-generation.js')
}

console.log('\n=== Summary ===\n')
console.log('• VRF keypairs are deterministically generated from seeds')
console.log('• The same seed always produces the same keypair')
console.log('• Public keys can be shared freely')
console.log('• Secret keys must be kept secure')
console.log('• Keys are hex-encoded for easy storage and transmission')
