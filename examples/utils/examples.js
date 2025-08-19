#!/usr/bin/env node

/**
 * VRF Helpers Usage Examples
 *
 * This file demonstrates how to use the VRF utility helpers
 * for common patterns and use cases.
 *
 * Run with: node examples.js
 */

const {
  VrfSigner,
  VrfVerifier,
  BatchProcessor,
  KeyDerivation,
  BeaconGenerator,
  VrfValidator,
  VrfFormatter,
  SafeVrfOperations,
  VrfUtils,
} = require('./vrf-helpers')

console.log('=== VRF Helpers Usage Examples ===\n')

// Example 1: Basic signing and verification
console.log('1. Basic Signing and Verification:')
try {
  const signer = new VrfSigner('example-seed-123')
  console.log('✓ Signer created')

  const signature = signer.sign('Hello, VRF!')
  console.log('✓ Message signed')
  console.log('  Hash:', VrfFormatter.formatHash(signature.hash))

  const isValid = VrfVerifier.verify(signature)
  console.log('✓ Verification:', isValid ? 'Valid' : 'Invalid')

  // Quick random value generation
  const randomValue = signer.random('lottery-draw-1')
  console.log('✓ Random value:', VrfFormatter.formatHash(randomValue))
} catch (error) {
  console.error('❌ Basic example failed:', error.message)
}

// Example 2: Safe operations with error handling
console.log('\n2. Safe Operations:')
const keyResult = SafeVrfOperations.safeGenerateKeypair('safe-seed')
if (keyResult.success) {
  console.log('✓ Safe keypair generation succeeded')

  const signResult = SafeVrfOperations.safeSign(keyResult.data, 'safe-message')
  if (signResult.success) {
    console.log('✓ Safe signing succeeded')

    const verifyResult = SafeVrfOperations.safeVerify(signResult.data)
    if (verifyResult.success) {
      console.log('✓ Safe verification:', verifyResult.data)
    }
  }
} else {
  console.error('❌ Safe operation failed:', keyResult.error.message)
}

// Test error case
const invalidResult = SafeVrfOperations.safeGenerateKeypair('') // Invalid seed
if (!invalidResult.success) {
  console.log('✓ Error handling works:', invalidResult.error.code)
}

// Example 3: Batch processing
console.log('\n3. Batch Processing:')
try {
  const batchSigner = new VrfSigner('batch-seed-456')
  const processor = new BatchProcessor(batchSigner)

  const messages = ['item-1', 'item-2', 'item-3', 'item-4', 'item-5']
  const signatures = processor.signBatch(messages)
  console.log(`✓ Batch signed ${signatures.length} messages`)

  const batchVerification = VrfVerifier.batchVerify(signatures)
  console.log(`✓ Batch verification: ${batchVerification.validCount}/${batchVerification.totalCount} valid`)

  // Random batch generation
  const inputs = ['draw-1', 'draw-2', 'draw-3']
  const randoms = processor.randomBatch(inputs)
  console.log('✓ Random batch generated:')
  randoms.forEach((r, i) => {
    console.log(`  ${r.input}: ${VrfFormatter.formatHash(r.random)}`)
  })
} catch (error) {
  console.error('❌ Batch processing failed:', error.message)
}

// Example 4: Hierarchical key derivation
console.log('\n4. Hierarchical Key Derivation:')
try {
  const keyDeriver = new KeyDerivation('organization-master-seed')

  // Department keys
  const engineering = keyDeriver.deriveKey(['dept', 'engineering'])
  const marketing = keyDeriver.deriveKey(['dept', 'marketing'])

  console.log('✓ Department keys derived')
  console.log('  Engineering:', VrfFormatter.formatPublicKey(engineering.getPublicKey()))
  console.log('  Marketing:', VrfFormatter.formatPublicKey(marketing.getPublicKey()))

  // Employee keys within departments
  const alice = keyDeriver.deriveKey(['dept', 'engineering', 'emp', 'alice'])
  const bob = keyDeriver.deriveKey(['dept', 'engineering', 'emp', 'bob'])

  console.log('✓ Employee keys derived')
  console.log('  Alice:', VrfFormatter.formatPublicKey(alice.getPublicKey()))
  console.log('  Bob:', VrfFormatter.formatPublicKey(bob.getPublicKey()))

  // Demonstrate key isolation
  const aliceSign = alice.sign('confidential-document')
  const bobVerify = VrfVerifier.verify(aliceSign)
  console.log('✓ Cross-employee verification works:', bobVerify)

  console.log('✓ Keys cached:', keyDeriver.getCacheSize())
} catch (error) {
  console.error('❌ Key derivation failed:', error.message)
}

// Example 5: Random beacon generation
console.log('\n5. Random Beacon Generation:')
try {
  const beacon = new BeaconGenerator('beacon-seed-789', 'example-beacon')

  // Generate sequence of beacons
  console.log('✓ Generating beacon sequence:')
  for (let epoch = 1; epoch <= 5; epoch++) {
    const output = beacon.generateBeacon(epoch)
    console.log(`  Epoch ${epoch}: ${VrfFormatter.formatHash(output.randomness)}`)
  }

  // Verify beacon history
  const history = beacon.getHistory()
  const allValid = history.every((b) => beacon.verifyBeacon(b))
  console.log('✓ Beacon chain verification:', allValid)
  console.log('✓ Total beacons generated:', history.length)
} catch (error) {
  console.error('❌ Beacon generation failed:', error.message)
}

// Example 6: Validation and formatting
console.log('\n6. Validation and Formatting:')
try {
  const testSigner = new VrfSigner('validation-seed')
  const testSignature = testSigner.sign('validation-test')

  // Validate components
  const validKey = VrfValidator.isValidPublicKey(testSignature.publicKey)
  const validProof = VrfValidator.isValidProof(testSignature.proof)
  const validHash = VrfValidator.isValidHash(testSignature.hash)
  const validResult = VrfValidator.isValidSignatureResult(testSignature)

  console.log('✓ Validation results:')
  console.log('  Public key valid:', validKey)
  console.log('  Proof valid:', validProof)
  console.log('  Hash valid:', validHash)
  console.log('  Signature result valid:', validResult)

  // Format for display
  const formatted = VrfFormatter.formatSignatureResult(testSignature)
  console.log('✓ Formatted result:')
  console.log(formatted)
} catch (error) {
  console.error('❌ Validation failed:', error.message)
}

// Example 7: Utility functions
console.log('\n7. Utility Functions:')
try {
  const testHash = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'

  // Hash to number conversion
  const randomIndex = VrfUtils.hashToNumber(testHash, 100)
  console.log('✓ Hash to number (0-99):', randomIndex)

  // Random selection
  const items = ['Apple', 'Banana', 'Cherry', 'Date', 'Elderberry']
  const selected = VrfUtils.selectRandom(items, testHash)
  console.log('✓ Random selection:', selected)

  // Array shuffling
  const shuffled = VrfUtils.shuffleArray(items, testHash)
  console.log('✓ Shuffled array:', shuffled)

  // Unique random numbers
  const uniqueNumbers = VrfUtils.generateUniqueNumbers(3, 10, testHash)
  console.log('✓ Unique random numbers:', uniqueNumbers)

  // Secure seed generation
  const secureSeed = VrfUtils.generateSecureSeed(16)
  console.log('✓ Secure seed generated:', secureSeed.length, 'characters')

  // Deterministic seed creation
  const deterministicSeed = VrfUtils.createDeterministicSeed(['app', 'user123', 'session456'])
  console.log('✓ Deterministic seed:', deterministicSeed)
} catch (error) {
  console.error('❌ Utility functions failed:', error.message)
}

// Example 8: Advanced patterns
console.log('\n8. Advanced Patterns:')

// Child key derivation
try {
  const parentSigner = new VrfSigner('parent-seed')
  const childSigner = parentSigner.derive('child-path')

  const parentSign = parentSigner.sign('parent-message')
  const childSign = childSigner.sign('child-message')

  console.log('✓ Parent-child key derivation:')
  console.log('  Parent key:', VrfFormatter.formatPublicKey(parentSigner.getPublicKey()))
  console.log('  Child key:', VrfFormatter.formatPublicKey(childSigner.getPublicKey()))
  console.log('  Keys are different:', parentSigner.getPublicKey() !== childSigner.getPublicKey())
} catch (error) {
  console.error('❌ Child derivation failed:', error.message)
}

// Complex batch processing with custom mapping
try {
  const complexSigner = new VrfSigner('complex-batch-seed')
  const complexProcessor = new BatchProcessor(complexSigner)

  const dataItems = [
    { id: 1, type: 'user', name: 'Alice' },
    { id: 2, type: 'user', name: 'Bob' },
    { id: 3, type: 'admin', name: 'Charlie' },
  ]

  const results = complexProcessor.processBatch(
    dataItems,
    (item) => `${item.type}:${item.id}:${item.name}`, // message mapper
    (item) => JSON.stringify({ type: item.type, ts: Date.now() }), // aux data mapper
  )

  console.log('✓ Complex batch processing:')
  results.forEach((result) => {
    console.log(`  ${result.item.name}: ${VrfFormatter.formatHash(result.random)}`)
  })
} catch (error) {
  console.error('❌ Complex batch processing failed:', error.message)
}

// Example 9: Error scenarios
console.log('\n9. Error Handling Scenarios:')

// Invalid seed
try {
  const invalidSigner = new VrfSigner('')
} catch (error) {
  console.log('✓ Invalid seed caught:', error.message.substring(0, 50) + '...')
}

// Invalid message
try {
  const signer = new VrfSigner('valid-seed')
  signer.sign(null)
} catch (error) {
  console.log('✓ Invalid message caught:', error.message)
}

// Invalid verification data
const fakeSignature = {
  message: 'test',
  proof: 'invalid-proof',
  hash: 'invalid-hash',
  publicKey: 'invalid-key',
  timestamp: Date.now(),
}

const verifyResult = VrfVerifier.verify(fakeSignature)
console.log('✓ Invalid signature rejected:', !verifyResult)

console.log('\n=== Summary ===\n')
console.log('• VrfSigner provides simplified signing with error handling')
console.log('• VrfVerifier offers static methods for verification operations')
console.log('• BatchProcessor enables high-throughput operations')
console.log('• KeyDerivation supports hierarchical key management')
console.log('• BeaconGenerator creates verifiable random beacon chains')
console.log('• Validators and formatters ensure data integrity and readability')
console.log('• SafeVrfOperations provide robust error handling')
console.log('• VrfUtils offer common operations like random selection and shuffling')
console.log('• All utilities maintain compatibility with the core VRF library')
