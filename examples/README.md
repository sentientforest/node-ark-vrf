# node-ark-vrf Examples

This directory contains comprehensive examples demonstrating how to use the node-ark-vrf library for various use cases.

## Quick Start

The easiest way to get started is to run the basic examples in order:

```bash
# Install dependencies first
cd .. && yarn install && yarn build && cd examples

# Run basic examples
node basic/01-keypair-generation.js
node basic/02-proof-generation.js
node basic/03-verification.js
```

## Example Categories

### 📚 Basic Examples (`basic/`)

Learn the fundamental VRF operations:

- **01-keypair-generation.js** - Generate VRF keypairs from seeds
- **02-proof-generation.js** - Create VRF proofs for messages
- **03-verification.js** - Verify VRF proofs with public keys
- **04-proof-to-hash.js** - Convert proofs to deterministic hash outputs

### 🚀 Advanced Features (`advanced/`)

Explore advanced VRF capabilities:

- **01-auxiliary-data.js** - Bind additional context to VRF proofs
- **02-deterministic-keys.js** - Derive keys deterministically from master seeds
- **03-batch-operations.js** - Process multiple VRF operations efficiently
- **04-error-handling.js** - Handle errors and edge cases properly

### 💡 Real-World Use Cases (`use-cases/`)

See VRFs in action for practical applications:

- **01-random-beacon.js** - Build an unbiasable distributed random beacon
- **02-leader-election.js** - Implement fair leader selection for consensus
- **03-lottery-system.js** - Create a verifiable and fair lottery
- **04-dns-privacy.js** - Privacy-preserving DNS with authenticated denial

### 📘 TypeScript (`typescript/`)

TypeScript examples with full type safety:

- **basic-usage.ts** - Basic VRF operations in TypeScript
- **type-safety.ts** - Leverage TypeScript's type system for safer code

### ⚡ Performance (`benchmarks/`)

Measure and optimize performance:

- **performance.js** - Benchmark VRF operations
- **comparison.js** - Compare with other VRF implementations

### 🔗 Integration Examples (`integration/`)

Integrate VRFs into real applications:

- **express-api/** - REST API server with VRF endpoints
- **react-demo/** - Browser-based demo application

### 🛠️ Utilities (`utils/`)

Helper functions and utilities:

- **helpers.js** - Common utility functions for examples
- **test-vectors.js** - Work with official test vectors

## Prerequisites

Before running the examples, make sure you have:

1. Node.js 14+ installed
2. Built the native addon:
   ```bash
   cd ..
   yarn install
   yarn build
   ```

## Running Examples

Most examples can be run directly with Node.js:

```bash
node basic/01-keypair-generation.js
```

For TypeScript examples, you can use `ts-node`:

```bash
npx ts-node typescript/basic-usage.ts
```

Or compile and run:

```bash
npx tsc typescript/basic-usage.ts
node typescript/basic-usage.js
```

## Common Patterns

### Error Handling

Always wrap VRF operations in try-catch blocks for production code:

```javascript
try {
  const proof = vrf.vrfProve(secretKey, message)
} catch (error) {
  console.error('Failed to generate proof:', error.message)
}
```

### Key Management

Never hardcode secret keys in production:

```javascript
// ❌ Don't do this in production
const keypair = vrf.generateKeypairFromSeed('hardcoded-seed')

// ✅ Use environment variables or secure key management
const keypair = vrf.generateKeypairFromSeed(process.env.VRF_SEED)
```

### Auxiliary Data

Use auxiliary data to bind context to proofs:

```javascript
const context = {
  timestamp: Date.now(),
  userId: 'user123',
  nonce: crypto.randomBytes(16).toString('hex'),
}

const proof = vrf.vrfProve(
  secretKey,
  message,
  JSON.stringify(context), // Auxiliary data
)
```

## Understanding VRF Properties

### Uniqueness

For any input and key pair, there is exactly one valid VRF output.

### Collision Resistance

It's computationally infeasible to find two different inputs that produce the same VRF output.

### Pseudorandomness

The VRF output is indistinguishable from random to anyone without the secret key.

## Troubleshooting

### "Cannot find module 'node-ark-vrf'"

Make sure you've built the library:

```bash
cd .. && yarn build
```

### "Invalid key format"

Keys must be hex-encoded strings. Check that you're not passing raw bytes.

### "Verification failed"

Ensure you're using:

- The correct public key
- The exact same message
- The same auxiliary data (if any)

## Learn More

- [VRF Specification (RFC 9381)](https://datatracker.ietf.org/doc/rfc9381/)
- [ark-vrf Documentation](https://github.com/davxy/ark-vrf)
- [Bandersnatch Curve](https://eprint.iacr.org/2021/1152)

## Contributing

Found a bug or have a suggestion? Please open an issue or submit a PR!
