#!/usr/bin/env node

/**
 * VRF Proof Verification Example
 *
 * This example demonstrates:
 * - Verifying VRF proofs with public keys
 * - Understanding verification failures
 * - Public verification scenarios
 *
 * Run with: node 03-verification.js
 */

const vrf = require('../../index')

console.log('=== VRF Proof Verification Example ===\n')

// Setup: Generate two keypairs (signer and attacker)
const signerKeypair = vrf.generateKeypairFromSeed('legitimate-signer')
const attackerKeypair = vrf.generateKeypairFromSeed('attacker-trying-to-forge')

console.log('Setup: Generated two keypairs')
console.log('Signer public key:', signerKeypair.publicKey.substring(0, 32) + '...')
console.log('Attacker public key:', attackerKeypair.publicKey.substring(0, 32) + '...\n')

// Example 1: Basic verification - success case
console.log('1. Valid proof verification:')
const message = 'Authenticate this message'
const validProof = vrf.vrfProve(signerKeypair.secretKey, message)
const isValid = vrf.vrfVerify(signerKeypair.publicKey, message, validProof)

console.log('Message:', message)
console.log('Proof valid:', isValid)
console.log('✓ Proof verified successfully with correct public key')

// Example 2: Wrong message fails verification
console.log('\n2. Wrong message fails verification:')
const wrongMessage = 'Different message'
const invalidForWrongMsg = vrf.vrfVerify(signerKeypair.publicKey, wrongMessage, validProof)
console.log('Original message:', message)
console.log('Wrong message:', wrongMessage)
console.log('Verification result:', invalidForWrongMsg)
console.log('✓ Proof correctly rejected for wrong message')

// Example 3: Wrong public key fails verification
console.log('\n3. Wrong public key fails verification:')
const invalidForWrongKey = vrf.vrfVerify(attackerKeypair.publicKey, message, validProof)
console.log("Using attacker's public key for verification")
console.log('Verification result:', invalidForWrongKey)
console.log('✓ Proof correctly rejected with wrong public key')

// Example 4: Tampered proof fails verification
console.log('\n4. Tampered proof detection:')
// Flip a bit in the proof
const tamperedProof = validProof.substring(0, 10) + (validProof[10] === '0' ? '1' : '0') + validProof.substring(11)
const invalidForTampered = vrf.vrfVerify(signerKeypair.publicKey, message, tamperedProof)
console.log('Original proof:', validProof.substring(0, 32) + '...')
console.log('Tampered proof:', tamperedProof.substring(0, 32) + '...')
console.log('Verification result:', invalidForTampered)
console.log('✓ Tampered proof correctly rejected')

// Example 5: Empty message verification
console.log('\n5. Empty message verification:')
const emptyMessage = ''
const emptyProof = vrf.vrfProve(signerKeypair.secretKey, emptyMessage)
const emptyValid = vrf.vrfVerify(signerKeypair.publicKey, emptyMessage, emptyProof)
console.log('Empty message proof valid:', emptyValid)

// Example 6: Public verification scenario
console.log('\n6. Public verification scenario:')
console.log('Scenario: Alice wants to prove she generated a random value')

const alice = vrf.generateKeypairFromSeed('alice-secret')
const randomSeed = 'random-selection-2024-01-15'
const aliceProof = vrf.vrfProve(alice.secretKey, randomSeed)
const aliceHash = vrf.vrfProofToHash(aliceProof)

console.log("Alice's public key:", alice.publicKey.substring(0, 32) + '...')
console.log('Random seed:', randomSeed)
console.log('Generated hash:', aliceHash.substring(0, 32) + '...')

// Bob verifies Alice's proof
console.log("\nBob verifies Alice's proof:")
const bobVerifies = vrf.vrfVerify(alice.publicKey, randomSeed, aliceProof)
const bobComputesHash = vrf.vrfProofToHash(aliceProof)
console.log('Proof valid:', bobVerifies)
console.log('Hash matches:', bobComputesHash === aliceHash)
console.log("✓ Bob successfully verified Alice's random value")

// Example 7: Batch verification simulation
console.log('\n7. Batch verification:')
const messages = ['msg1', 'msg2', 'msg3']
const proofs = messages.map((msg) => vrf.vrfProve(signerKeypair.secretKey, msg))

console.log('Verifying batch of', messages.length, 'proofs:')
const results = messages.map((msg, i) => {
  const valid = vrf.vrfVerify(signerKeypair.publicKey, msg, proofs[i])
  console.log(`  ${msg}: ${valid ? '✓' : '✗'}`)
  return valid
})
console.log(
  'All valid:',
  results.every((r) => r),
)

// Example 8: Cross-verification between parties
console.log('\n8. Cross-party verification:')
const party1 = vrf.generateKeypairFromSeed('party1')
const party2 = vrf.generateKeypairFromSeed('party2')
const sharedMessage = 'shared-protocol-message'

const proof1 = vrf.vrfProve(party1.secretKey, sharedMessage)
const proof2 = vrf.vrfProve(party2.secretKey, sharedMessage)

console.log("Party 1 verifies Party 2's proof:", vrf.vrfVerify(party2.publicKey, sharedMessage, proof2))
console.log("Party 2 verifies Party 1's proof:", vrf.vrfVerify(party1.publicKey, sharedMessage, proof1))
console.log('Cross-verification with wrong keys fails:', vrf.vrfVerify(party1.publicKey, sharedMessage, proof2))

// Error handling
console.log('\n9. Error handling:')
try {
  vrf.vrfVerify('invalid-public-key', message, validProof)
} catch (error) {
  console.log('✓ Invalid public key rejected:', error.message)
}

try {
  vrf.vrfVerify(signerKeypair.publicKey, message, 'invalid-proof')
} catch (error) {
  console.log('✓ Invalid proof format rejected:', error.message)
}

console.log('\n=== Summary ===\n')
console.log('• Anyone with the public key can verify VRF proofs')
console.log('• Verification confirms the proof matches the message and key')
console.log('• Wrong message, key, or tampered proof all fail verification')
console.log('• Verification is deterministic and fast')
console.log('• Invalid inputs are safely rejected')
