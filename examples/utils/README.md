# VRF Utility Helpers

This directory contains high-level utility functions and classes that simplify common VRF operations and provide additional functionality built on top of the core VRF library.

## Quick Start

```javascript
const { VrfSigner, VrfVerifier, BatchProcessor } = require('./vrf-helpers')

// Simple signing
const signer = new VrfSigner('my-secret-seed')
const signature = signer.sign('my-message')
const isValid = VrfVerifier.verify(signature)
```

## Available Utilities

### Core Classes

#### `VrfSigner`

Simplified VRF signing with built-in error handling.

```javascript
const signer = new VrfSigner('seed-string')

// Basic signing
const signature = signer.sign('message')
const randomValue = signer.random('input') // Just returns hash

// With auxiliary data
const contextSignature = signer.sign('message', 'context-data')

// Key derivation
const childSigner = signer.derive('child-path')
```

#### `VrfVerifier`

Static methods for verification operations.

```javascript
// Verify signature result
const isValid = VrfVerifier.verify(signatureResult)

// Explicit verification
const isValid = VrfVerifier.verifyExplicit(publicKey, message, proof, auxData)

// Batch verification
const results = VrfVerifier.batchVerify([sig1, sig2, sig3])
console.log(`${results.validCount}/${results.totalCount} signatures valid`)
```

#### `BatchProcessor`

High-throughput batch operations.

```javascript
const processor = new BatchProcessor(signer)

// Sign multiple messages
const signatures = processor.signBatch(['msg1', 'msg2', 'msg3'])

// Generate random values for inputs
const randoms = processor.randomBatch(['input1', 'input2'])

// Process with custom mapping
const results = processor.processBatch(
  items,
  (item) => `process:${item.id}`, // message mapper
  (item) => JSON.stringify(item.meta), // aux data mapper
)
```

### Specialized Utilities

#### `KeyDerivation`

Hierarchical deterministic key management.

```javascript
const keyDeriver = new KeyDerivation('master-seed')

// Derive keys by path
const userKey = keyDeriver.deriveKey(['users', 'alice'])
const sessionKey = keyDeriver.deriveKey(['users', 'alice', 'session-123'])

// Keys are cached automatically
console.log('Cached keys:', keyDeriver.getCacheSize())
```

#### `BeaconGenerator`

Random beacon generation with history tracking.

```javascript
const beacon = new BeaconGenerator('beacon-seed', 'beacon-id')

// Generate sequential beacons
for (let epoch = 1; epoch <= 5; epoch++) {
  const output = beacon.generateBeacon(epoch)
  console.log(`Epoch ${epoch}: ${output.randomness}`)
}

// Verify beacon chain
const history = beacon.getHistory()
const allValid = history.every((b) => beacon.verifyBeacon(b))
```

### Validation and Formatting

#### `VrfValidator`

Input validation utilities.

```javascript
// Validate formats
const validKey = VrfValidator.isValidPublicKey(publicKey)
const validProof = VrfValidator.isValidProof(proof)
const validHash = VrfValidator.isValidHash(hash)
const validResult = VrfValidator.isValidSignatureResult(signature)
```

#### `VrfFormatter`

Display formatting utilities.

```javascript
// Format for display
const shortHash = VrfFormatter.formatHash(hash, 16)
const shortKey = VrfFormatter.formatPublicKey(publicKey, 16)
const logData = VrfFormatter.formatSignatureResult(signature)

console.log('Signature:', logData)
// Output: { message: "hello world", hash: "a1b2c3d4...", ... }
```

### Error Handling

#### `SafeVrfOperations`

Safe operations with error handling.

```javascript
// Safe operations return { success, data } or { success, error }
const keyResult = SafeVrfOperations.safeGenerateKeypair('seed')
if (keyResult.success) {
  const signer = keyResult.data

  const signResult = SafeVrfOperations.safeSign(signer, 'message')
  if (signResult.success) {
    const signature = signResult.data

    const verifyResult = SafeVrfOperations.safeVerify(signature)
    console.log('Valid:', verifyResult.success && verifyResult.data)
  }
}
```

#### `VrfError`

Custom error class with error codes.

```javascript
try {
  const signer = new VrfSigner('') // Invalid seed
} catch (error) {
  if (error instanceof VrfError) {
    console.log('Error code:', error.code)
    console.log('Details:', error.details)
  }
}
```

### General Utilities

#### `VrfUtils`

Collection of utility functions.

```javascript
// Generate secure random seed
const seed = VrfUtils.generateSecureSeed(32)

// Create deterministic seed from components
const deterministicSeed = VrfUtils.createDeterministicSeed(['app', 'user', 'session'])

// Convert VRF hash to number in range
const randomIndex = VrfUtils.hashToNumber(hash, arrayLength)

// Select random item using VRF
const randomItem = VrfUtils.selectRandom(items, hash)

// Shuffle array deterministically
const shuffled = VrfUtils.shuffleArray(items, hash)

// Generate unique random numbers
const uniqueNumbers = VrfUtils.generateUniqueNumbers(5, 100, hash)
```

## Common Patterns

### Secure Random Selection

```javascript
const signer = new VrfSigner('selection-seed')
const candidates = ['Alice', 'Bob', 'Charlie', 'Diana']

// Generate verifiable random selection
const selectionHash = signer.random('selection-round-1')
const winner = VrfUtils.selectRandom(candidates, selectionHash)

console.log('Winner:', winner)
console.log('Verifiable with hash:', selectionHash)
```

### Hierarchical Key Management

```javascript
const orgKeys = new KeyDerivation('company-master-seed')

// Department keys
const engineering = orgKeys.deriveKey(['dept', 'engineering'])
const marketing = orgKeys.deriveKey(['dept', 'marketing'])

// Employee keys
const alice = orgKeys.deriveKey(['dept', 'engineering', 'emp', 'alice'])
const bob = orgKeys.deriveKey(['dept', 'engineering', 'emp', 'bob'])

// Project keys
const projectA = orgKeys.deriveKey(['projects', 'project-alpha'])
```

### Batch Processing Pipeline

```javascript
const signer = new VrfSigner('batch-processing-seed')
const processor = new BatchProcessor(signer)

// Process large dataset
const dataset = generateLargeDataset() // Your data

const results = processor.processBatch(
  dataset,
  (item) => `data:${item.id}:${item.type}`,
  (item) => JSON.stringify({ timestamp: Date.now(), version: '1.0' }),
)

// Verify all results
const verification = VrfVerifier.batchVerify(results.map((r) => r.signature))

console.log(`Processed ${verification.validCount} items successfully`)
```

### Time-Based Beacons

```javascript
class TimeBasedBeacon extends BeaconGenerator {
  constructor(seed, beaconId, intervalMs = 60000) {
    super(seed, beaconId)
    this.intervalMs = intervalMs
  }

  getCurrentEpoch() {
    return Math.floor(Date.now() / this.intervalMs)
  }

  generateCurrentBeacon() {
    return this.generateBeacon(this.getCurrentEpoch())
  }

  isBeaconCurrent(beacon, toleranceEpochs = 1) {
    const currentEpoch = this.getCurrentEpoch()
    return Math.abs(beacon.epoch - currentEpoch) <= toleranceEpochs
  }
}

const timeBeacon = new TimeBasedBeacon('time-seed', 'clock', 60000) // 1 minute
const currentBeacon = timeBeacon.generateCurrentBeacon()
```

### Error Recovery

```javascript
function robustVrfOperation(seed, message, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const keyResult = SafeVrfOperations.safeGenerateKeypair(seed)
    if (!keyResult.success) {
      console.warn(`Attempt ${attempt} keygen failed:`, keyResult.error.message)
      continue
    }

    const signResult = SafeVrfOperations.safeSign(keyResult.data, message)
    if (!signResult.success) {
      console.warn(`Attempt ${attempt} signing failed:`, signResult.error.message)
      continue
    }

    const verifyResult = SafeVrfOperations.safeVerify(signResult.data)
    if (verifyResult.success && verifyResult.data) {
      return signResult.data // Success!
    }

    console.warn(`Attempt ${attempt} verification failed`)
  }

  throw new VrfError('All VRF operation attempts failed', 'MAX_RETRIES_EXCEEDED')
}
```

## Performance Considerations

### Memory Usage

- `KeyDerivation` caches derived keys - call `clearCache()` periodically
- `BeaconGenerator` stores history - implement pruning for long-running beacons
- `BatchProcessor` processes in memory - use streaming for very large datasets

### Optimization Tips

- Reuse `VrfSigner` instances when possible
- Use batch operations for multiple items
- Cache frequently used derived keys
- Validate inputs before expensive operations

### Error Handling

- Use `SafeVrfOperations` for production code
- Implement retry logic with exponential backoff
- Log errors with proper context
- Monitor error rates and patterns

## Integration Examples

### Express.js Middleware

```javascript
const { VrfSigner, VrfValidator } = require('./vrf-helpers')

function vrfMiddleware(seed) {
  const signer = new VrfSigner(seed)

  return (req, res, next) => {
    req.vrf = {
      sign: (message, auxData) => signer.sign(message, auxData),
      verify: (signature) => VrfVerifier.verify(signature),
      random: (input) => signer.random(input),
    }
    next()
  }
}

app.use(vrfMiddleware(process.env.VRF_SEED))
```

### Database Integration

```javascript
class VrfDatabase {
  constructor(db, seed) {
    this.db = db
    this.signer = new VrfSigner(seed)
  }

  async storeVerifiableRecord(data) {
    const record = JSON.stringify(data)
    const signature = this.signer.sign(
      record,
      JSON.stringify({
        timestamp: Date.now(),
        table: 'records',
      }),
    )

    return this.db.insert('records', {
      data: record,
      vrf_proof: signature.proof,
      vrf_hash: signature.hash,
      vrf_public_key: signature.publicKey,
      created_at: new Date(signature.timestamp),
    })
  }

  async verifyRecord(recordId) {
    const record = await this.db.findById('records', recordId)
    const signature = {
      message: record.data,
      proof: record.vrf_proof,
      hash: record.vrf_hash,
      publicKey: record.vrf_public_key,
      auxData: JSON.stringify({
        timestamp: record.created_at.getTime(),
        table: 'records',
      }),
    }

    return VrfVerifier.verify(signature)
  }
}
```
