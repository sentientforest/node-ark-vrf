#!/usr/bin/env node

/**
 * VRF Proof to Hash Conversion Example
 *
 * This example demonstrates:
 * - Converting VRF proofs to deterministic hash outputs
 * - Understanding the relationship between proofs and hashes
 * - Using VRF outputs as random values
 *
 * Run with: node 04-proof-to-hash.js
 */

const vrf = require('../../index')
const crypto = require('crypto')

console.log('=== VRF Proof to Hash Example ===\n')

// Setup
const keypair = vrf.generateKeypairFromSeed('hash-example-seed')
console.log('Generated keypair for examples\n')

// Example 1: Basic proof to hash conversion
console.log('1. Basic proof to hash conversion:')
const message1 = 'Convert me to hash'
const proof1 = vrf.vrfProve(keypair.secretKey, message1)
const hash1 = vrf.vrfProofToHash(proof1)

console.log('Message:', message1)
console.log('Proof:', proof1.substring(0, 64) + '...')
console.log('Hash:', hash1)
console.log('Hash length:', hash1.length, 'characters (', hash1.length / 2, 'bytes)')

// Example 2: Hash is deterministic from proof
console.log('\n2. Hash is deterministic:')
const hash1Again = vrf.vrfProofToHash(proof1)
console.log('Same proof → same hash:', hash1 === hash1Again)

// Example 3: Different proofs produce different hashes
console.log('\n3. Different proofs → different hashes:')
const message2 = 'Different input'
const proof2 = vrf.vrfProve(keypair.secretKey, message2)
const hash2 = vrf.vrfProofToHash(proof2)

console.log('Hash 1:', hash1.substring(0, 32) + '...')
console.log('Hash 2:', hash2.substring(0, 32) + '...')
console.log('Hashes differ:', hash1 !== hash2)

// Example 4: Using hash as random value
console.log('\n4. Using VRF hash as random value:')
const randomSeed = `lottery-drawing-${Date.now()}`
const lotteryProof = vrf.vrfProve(keypair.secretKey, randomSeed)
const lotteryHash = vrf.vrfProofToHash(lotteryProof)

// Convert hash to number for lottery
const hashBytes = Buffer.from(lotteryHash.substring(0, 16), 'hex')
const randomNumber = hashBytes.readBigUInt64BE() % 1000n
console.log('Lottery seed:', randomSeed)
console.log('VRF hash:', lotteryHash.substring(0, 32) + '...')
console.log('Winning number (0-999):', randomNumber.toString())

// Example 5: Hash distribution
console.log('\n5. Hash distribution analysis:')
const samples = 100
const hashes = []
for (let i = 0; i < samples; i++) {
  const proof = vrf.vrfProve(keypair.secretKey, `sample-${i}`)
  const hash = vrf.vrfProofToHash(proof)
  hashes.push(hash)
}

// Check first byte distribution
const firstBytes = hashes.map((h) => parseInt(h.substring(0, 2), 16))
const min = Math.min(...firstBytes)
const max = Math.max(...firstBytes)
const avg = firstBytes.reduce((a, b) => a + b, 0) / samples

console.log(`Generated ${samples} hashes`)
console.log('First byte statistics:')
console.log('  Min:', min, '(expect ~0)')
console.log('  Max:', max, '(expect ~255)')
console.log('  Avg:', avg.toFixed(1), '(expect ~127.5)')

// Example 6: Sequential inputs
console.log('\n6. Sequential inputs produce unpredictable hashes:')
for (let i = 0; i < 5; i++) {
  const seqProof = vrf.vrfProve(keypair.secretKey, `sequence-${i}`)
  const seqHash = vrf.vrfProofToHash(seqProof)
  console.log(`  input ${i} → ${seqHash.substring(0, 16)}...`)
}

// Example 7: Hash as entropy source
console.log('\n7. Using VRF hash as entropy:')
const entropyProof = vrf.vrfProve(keypair.secretKey, 'entropy-generation')
const entropyHash = vrf.vrfProofToHash(entropyProof)
const entropyBuffer = Buffer.from(entropyHash, 'hex')

// Use VRF output to seed a PRNG
const deterministicRandom = crypto.createHash('sha256').update(entropyBuffer).digest()
console.log('VRF hash:', entropyHash.substring(0, 32) + '...')
console.log('Derived random:', deterministicRandom.toString('hex').substring(0, 32) + '...')

// Example 8: Verification preserves hash
console.log('\n8. Hash consistency through verification:')
const testMessage = 'verify-hash-consistency'
const testProof = vrf.vrfProve(keypair.secretKey, testMessage)
const originalHash = vrf.vrfProofToHash(testProof)

// Verifier computes the same hash
const isValid = vrf.vrfVerify(keypair.publicKey, testMessage, testProof)
const verifierHash = vrf.vrfProofToHash(testProof)

console.log('Original hash:', originalHash.substring(0, 32) + '...')
console.log('Verifier hash:', verifierHash.substring(0, 32) + '...')
console.log('Proof valid:', isValid)
console.log('Hashes match:', originalHash === verifierHash)

// Example 9: Hash uniqueness property
console.log('\n9. Hash uniqueness property:')
const uniqueMessage = 'unique-output-test'

// Even if someone tries to create a different proof,
// the hash for this message+key is unique
const legitProof = vrf.vrfProve(keypair.secretKey, uniqueMessage)
const legitHash = vrf.vrfProofToHash(legitProof)

console.log('Message:', uniqueMessage)
console.log('Unique hash:', legitHash.substring(0, 32) + '...')
console.log('This hash is deterministically tied to the message and key')

// Example 10: Performance
console.log('\n10. Performance:')
const perfProof = vrf.vrfProve(keypair.secretKey, 'performance-test')
const iterations = 10000
const start = Date.now()
for (let i = 0; i < iterations; i++) {
  vrf.vrfProofToHash(perfProof)
}
const elapsed = Date.now() - start
console.log(`Converted ${iterations} proofs to hashes in ${elapsed}ms`)
console.log(`Average: ${(elapsed / iterations).toFixed(3)}ms per conversion`)

console.log('\n=== Summary ===\n')
console.log('• VRF proofs can be converted to fixed-size hash outputs')
console.log('• The hash is deterministic from the proof')
console.log('• Hashes appear random but are verifiable')
console.log('• Useful for random number generation with proof')
console.log('• Hash conversion is very fast (~0.001ms)')
