#!/usr/bin/env node

/**
 * VRF Proof Generation Example
 *
 * This example demonstrates:
 * - Creating VRF proofs for messages
 * - Understanding proof determinism
 * - Working with different input types
 *
 * Run with: node 02-proof-generation.js
 */

const vrf = require('../../index')
const crypto = require('crypto')

console.log('=== VRF Proof Generation Example ===\n')

// Setup: Generate a keypair
const keypair = vrf.generateKeypairFromSeed('example-seed-for-proofs')
console.log('Generated keypair from seed')
console.log('Public key:', keypair.publicKey.substring(0, 32) + '...\n')

// Example 1: Basic proof generation
console.log('1. Basic proof generation:')
const message1 = 'Hello, VRF World!'
const proof1 = vrf.vrfProve(keypair.secretKey, message1)

console.log('Message:', message1)
console.log('Proof:', proof1.substring(0, 64) + '...')
console.log('Proof length:', proof1.length)

// Example 2: Proof determinism
console.log('\n2. Proofs are deterministic:')
const proof1Again = vrf.vrfProve(keypair.secretKey, message1)
console.log('Same message, same proof:', proof1 === proof1Again)

// Example 3: Different messages produce different proofs
console.log('\n3. Different messages = different proofs:')
const message2 = 'Different message'
const proof2 = vrf.vrfProve(keypair.secretKey, message2)
console.log('Message 1:', message1)
console.log('Message 2:', message2)
console.log('Proofs differ:', proof1 !== proof2)

// Example 4: Empty message
console.log('\n4. Empty message handling:')
const emptyProof = vrf.vrfProve(keypair.secretKey, '')
console.log('Empty message proof:', emptyProof.substring(0, 64) + '...')

// Example 5: Large message
console.log('\n5. Large message handling:')
const largeMessage = crypto.randomBytes(1024).toString('hex')
const largeProof = vrf.vrfProve(keypair.secretKey, largeMessage)
console.log('Message size:', largeMessage.length, 'bytes')
console.log('Proof size:', largeProof.length, 'bytes (constant size)')

// Example 6: Structured data as input
console.log('\n6. Using structured data:')
const structuredData = {
  userId: 'user-456',
  action: 'transfer',
  amount: 1000,
  timestamp: Date.now(),
}
const jsonMessage = JSON.stringify(structuredData)
const structuredProof = vrf.vrfProve(keypair.secretKey, jsonMessage)
console.log('Input data:', structuredData)
console.log('Proof:', structuredProof.substring(0, 64) + '...')

// Example 7: Binary data
console.log('\n7. Binary data (as hex):')
const binaryData = crypto.randomBytes(32)
const hexMessage = binaryData.toString('hex')
const binaryProof = vrf.vrfProve(keypair.secretKey, hexMessage)
console.log('Binary data (hex):', hexMessage)
console.log('Proof:', binaryProof.substring(0, 64) + '...')

// Example 8: Sequential proofs
console.log('\n8. Sequential proofs for numbered inputs:')
for (let i = 0; i < 3; i++) {
  const seqMessage = `message-${i}`
  const seqProof = vrf.vrfProve(keypair.secretKey, seqMessage)
  const hash = vrf.vrfProofToHash(seqProof)
  console.log(`  ${seqMessage} → ${hash.substring(0, 16)}...`)
}

// Performance note
console.log('\n9. Performance characteristics:')
const iterations = 100
const start = Date.now()
for (let i = 0; i < iterations; i++) {
  vrf.vrfProve(keypair.secretKey, `perf-test-${i}`)
}
const elapsed = Date.now() - start
console.log(`Generated ${iterations} proofs in ${elapsed}ms`)
console.log(`Average: ${(elapsed / iterations).toFixed(2)}ms per proof`)

// Error handling
console.log('\n10. Error handling:')
try {
  // Try with invalid secret key
  vrf.vrfProve('invalid-key', 'message')
} catch (error) {
  console.log('✓ Invalid key rejected:', error.message)
}

console.log('\n=== Summary ===\n')
console.log('• VRF proofs are deterministic (same input → same proof)')
console.log('• Proof size is constant regardless of message size')
console.log('• Any data can be used as input (strings, JSON, binary)')
console.log('• Proofs are cryptographically bound to the secret key')
console.log('• Invalid inputs are rejected with clear errors')
