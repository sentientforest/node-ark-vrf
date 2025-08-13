# Examples and Documentation Plan for node-ark-vrf

## Overview

This plan outlines the creation of comprehensive examples and documentation to help developers understand and integrate the node-ark-vrf library into their projects. The examples will cover basic usage, advanced scenarios, and real-world applications.

## Examples Directory Structure

```
examples/
├── README.md                    # Examples overview and guide
├── basic/
│   ├── 01-keypair-generation.js # Basic keypair creation
│   ├── 02-proof-generation.js   # Creating VRF proofs
│   ├── 03-verification.js       # Verifying proofs
│   └── 04-proof-to-hash.js      # Converting proofs to hashes
├── advanced/
│   ├── 01-auxiliary-data.js     # Using auxiliary data binding
│   ├── 02-deterministic-keys.js # Deterministic key derivation
│   ├── 03-batch-operations.js   # Processing multiple inputs
│   └── 04-error-handling.js     # Proper error handling patterns
├── use-cases/
│   ├── 01-random-beacon.js      # Distributed random beacon
│   ├── 02-leader-election.js    # Consensus leader selection
│   ├── 03-lottery-system.js     # Fair lottery implementation
│   └── 04-dns-privacy.js        # DNS query privacy (NSEC5-like)
├── typescript/
│   ├── basic-usage.ts           # TypeScript example
│   ├── type-safety.ts           # Leveraging type definitions
│   └── tsconfig.json             # TypeScript configuration
├── benchmarks/
│   ├── performance.js           # Performance measurements
│   └── comparison.js             # Compare with other VRF libs
├── integration/
│   ├── express-api/              # REST API example
│   │   ├── server.js
│   │   ├── package.json
│   │   └── README.md
│   └── react-demo/               # Browser usage demo
│       ├── src/
│       ├── package.json
│       └── README.md
└── utils/
    ├── helpers.js                # Shared utility functions
    └── test-vectors.js           # Working with test vectors
```

## Example Categories

### 1. Basic Examples

#### 01-keypair-generation.js

```javascript
/**
 * Basic Keypair Generation
 *
 * This example demonstrates:
 * - Generating VRF keypairs from seeds
 * - Understanding public/private key formats
 * - Key serialization and storage
 */

const vrf = require('node-ark-vrf')

// Generate from a seed string
const seed = 'my-secret-seed-phrase'
const keypair = vrf.generateKeypairFromSeed(seed)

console.log('Public Key:', keypair.publicKey)
console.log('Secret Key:', keypair.secretKey)

// Best practices for key management
// - Store secret keys securely
// - Never expose secret keys in logs
// - Use environment variables for production
```

#### 02-proof-generation.js

```javascript
/**
 * VRF Proof Generation
 *
 * This example demonstrates:
 * - Creating VRF proofs for messages
 * - Understanding the prove operation
 * - Working with hex-encoded values
 */

const vrf = require('node-ark-vrf')

const keypair = vrf.generateKeypairFromSeed('example-seed')
const message = 'Hello, VRF!'

// Generate a VRF proof
const proof = vrf.vrfProve(keypair.secretKey, message)

console.log('Message:', message)
console.log('Proof:', proof)

// The proof is deterministic - same input always produces same proof
const proof2 = vrf.vrfProve(keypair.secretKey, message)
console.log('Proofs match:', proof === proof2)
```

#### 03-verification.js

```javascript
/**
 * VRF Proof Verification
 *
 * This example demonstrates:
 * - Verifying VRF proofs
 * - Public key verification
 * - Handling verification results
 */

const vrf = require('node-ark-vrf')

const keypair = vrf.generateKeypairFromSeed('example-seed')
const message = 'Verify me!'
const proof = vrf.vrfProve(keypair.secretKey, message)

// Anyone with the public key can verify
const isValid = vrf.vrfVerify(keypair.publicKey, message, proof)

console.log('Verification result:', isValid)

// Wrong message fails verification
const wrongMessage = 'Different message'
const invalidResult = vrf.vrfVerify(keypair.publicKey, wrongMessage, proof)
console.log('Invalid message verification:', invalidResult)
```

### 2. Advanced Examples

#### 01-auxiliary-data.js

```javascript
/**
 * VRF with Auxiliary Data (VRF-AD)
 *
 * This example demonstrates:
 * - Binding additional context to proofs
 * - Use cases for auxiliary data
 * - Security implications
 */

const vrf = require('node-ark-vrf')

const keypair = vrf.generateKeypairFromSeed('secure-seed')
const message = 'transaction-id-12345'
const auxData = 'timestamp:1699123456,nonce:abc123'

// Create proof with auxiliary data
const proof = vrf.vrfProve(keypair.secretKey, message, auxData)

// Verification requires the same auxiliary data
const validWithAux = vrf.vrfVerify(keypair.publicKey, message, proof, auxData)
const invalidWithoutAux = vrf.vrfVerify(keypair.publicKey, message, proof)
const invalidWrongAux = vrf.vrfVerify(keypair.publicKey, message, proof, 'wrong-aux')

console.log('Valid with correct aux data:', validWithAux)
console.log('Invalid without aux data:', invalidWithoutAux)
console.log('Invalid with wrong aux data:', invalidWrongAux)
```

### 3. Real-World Use Cases

#### 01-random-beacon.js

```javascript
/**
 * Distributed Random Beacon
 *
 * This example demonstrates:
 * - Using VRF for unbiasable randomness
 * - Creating time-based random beacons
 * - Combining multiple VRF outputs
 */

const vrf = require('node-ark-vrf')
const crypto = require('crypto')

class RandomBeacon {
  constructor(seed) {
    this.keypair = vrf.generateKeypairFromSeed(seed)
  }

  generateBeacon(epoch) {
    const input = `beacon:${epoch}`
    const proof = vrf.vrfProve(this.keypair.secretKey, input)
    const hash = vrf.vrfProofToHash(proof)

    return {
      epoch,
      value: hash,
      proof,
      publicKey: this.keypair.publicKey,
    }
  }

  verifyBeacon(beacon, publicKey) {
    const input = `beacon:${beacon.epoch}`
    return vrf.vrfVerify(publicKey, input, beacon.proof)
  }
}

// Example usage
const beacon = new RandomBeacon('beacon-secret')
const epochNow = Math.floor(Date.now() / 60000) // 1-minute epochs

const output = beacon.generateBeacon(epochNow)
console.log('Random beacon:', output)

// Anyone can verify the beacon
const isValid = beacon.verifyBeacon(output, output.publicKey)
console.log('Beacon valid:', isValid)
```

#### 02-leader-election.js

```javascript
/**
 * Consensus Leader Election
 *
 * This example demonstrates:
 * - Fair leader selection using VRF
 * - Sybil-resistant voting
 * - Proof of eligibility
 */

const vrf = require('node-ark-vrf')

class ConsensusNode {
  constructor(nodeId, seed) {
    this.nodeId = nodeId
    this.keypair = vrf.generateKeypairFromSeed(seed)
    this.stake = Math.random() * 1000 // Simulated stake
  }

  proposeForSlot(slot) {
    const input = `slot:${slot}:node:${this.nodeId}`
    const proof = vrf.vrfProve(this.keypair.secretKey, input)
    const hash = vrf.vrfProofToHash(proof)

    // Convert hash to number for comparison
    const hashValue = BigInt('0x' + hash.slice(0, 16))
    const maxValue = BigInt('0xffffffffffffffff')
    const normalized = Number(hashValue) / Number(maxValue)

    // Probability proportional to stake
    const threshold = this.stake / 10000 // Assume 10000 total stake
    const isLeader = normalized < threshold

    return {
      nodeId: this.nodeId,
      slot,
      proof,
      hash,
      isLeader,
      publicKey: this.keypair.publicKey,
    }
  }

  verifyProposal(proposal) {
    const input = `slot:${proposal.slot}:node:${proposal.nodeId}`
    return vrf.vrfVerify(proposal.publicKey, input, proposal.proof)
  }
}

// Simulate leader election
const nodes = [
  new ConsensusNode('node1', 'seed1'),
  new ConsensusNode('node2', 'seed2'),
  new ConsensusNode('node3', 'seed3'),
]

const slot = 12345
const proposals = nodes.map((node) => node.proposeForSlot(slot))

// Find the leader (lowest VRF output among eligible nodes)
const leader = proposals.filter((p) => p.isLeader).sort((a, b) => a.hash.localeCompare(b.hash))[0]

if (leader) {
  console.log(`Leader for slot ${slot}: ${leader.nodeId}`)
  console.log('Leader proof valid:', nodes[0].verifyProposal(leader))
} else {
  console.log('No leader for this slot')
}
```

### 4. TypeScript Examples

#### basic-usage.ts

```typescript
/**
 * TypeScript VRF Usage
 *
 * This example demonstrates:
 * - Type-safe VRF operations
 * - Interface definitions
 * - Error handling with types
 */

import { generateKeypairFromSeed, vrfProve, vrfVerify, VrfKeyPair } from 'node-ark-vrf'

interface VrfMessage {
  id: string
  content: string
  timestamp: number
}

class VrfSigner {
  private keypair: VrfKeyPair

  constructor(seed: string) {
    this.keypair = generateKeypairFromSeed(seed)
  }

  signMessage(message: VrfMessage): string {
    const input = JSON.stringify(message)
    return vrfProve(this.keypair.secretKey, input)
  }

  getPublicKey(): string {
    return this.keypair.publicKey
  }

  static verifyMessage(publicKey: string, message: VrfMessage, proof: string): boolean {
    const input = JSON.stringify(message)
    return vrfVerify(publicKey, input, proof)
  }
}

// Usage
const signer = new VrfSigner('typescript-seed')
const message: VrfMessage = {
  id: 'msg-001',
  content: 'Hello TypeScript!',
  timestamp: Date.now(),
}

const proof = signer.signMessage(message)
const isValid = VrfSigner.verifyMessage(signer.getPublicKey(), message, proof)

console.log('Message signed and verified:', isValid)
```

## Building and Local Development Instructions

### Building the Library

```bash
# Clone the repository
git clone https://github.com/sentientforest/node-ark-vrf.git
cd node-ark-vrf

# Install dependencies
yarn install

# Build the native addon
yarn build

# Run tests
yarn test

# Build for debugging
yarn build:debug
```

### Using the Library Locally

#### Method 1: npm link (Recommended for development)

```bash
# In the node-ark-vrf directory
npm link

# In your project directory
npm link node-ark-vrf
```

#### Method 2: Local file reference

```json
// In your project's package.json
{
  "dependencies": {
    "node-ark-vrf": "file:../path/to/node-ark-vrf"
  }
}
```

#### Method 3: Direct require

```javascript
// In your project
const vrf = require('../path/to/node-ark-vrf')
```

### Development Workflow

1. **Make changes to Rust code** (`src/lib.rs`)
2. **Rebuild the native addon**: `yarn build`
3. **Test your changes**: `yarn test`
4. **Try examples**: `node examples/basic/01-keypair-generation.js`

## README.md Updates

### Proposed Structure

````markdown
# node-ark-vrf

Native Node.js bindings for Elliptic Curve VRF (Verifiable Random Functions) with Additional Data support.

## Features

- 🔐 **Cryptographically Secure**: Based on the robust ark-vrf Rust implementation
- ⚡ **High Performance**: Native Rust performance with Node.js convenience
- 🛡️ **IETF Compliant**: Follows RFC 9381 specifications
- 🔗 **Additional Data Binding**: Support for VRF-AD (auxiliary data)
- 🎯 **Production Ready**: Comprehensive test coverage and examples

## Installation

\```bash
npm install node-ark-vrf

# or

yarn add node-ark-vrf
\```

## Quick Start

\```javascript
const vrf = require('node-ark-vrf');

// Generate a keypair
const keypair = vrf.generateKeypairFromSeed('my-seed');

// Create a VRF proof
const proof = vrf.vrfProve(keypair.secretKey, 'my-message');

// Verify the proof
const isValid = vrf.vrfVerify(keypair.publicKey, 'my-message', proof);
\```

## Examples

Comprehensive examples are available in the `examples/` directory:

- **Basic Usage**: Keypair generation, proving, and verification
- **Advanced Features**: Auxiliary data, batch operations, error handling
- **Real-World Applications**: Random beacons, leader election, lottery systems
- **TypeScript**: Full TypeScript support with type definitions
- **Integration**: Express.js API and React demos

See [examples/README.md](./examples/README.md) for detailed guides.

## API Reference

[Full API documentation]

## Use Cases

- **Consensus Protocols**: Leader election and committee selection
- **Random Beacons**: Unbiasable distributed randomness
- **Privacy-Preserving DNS**: NSEC5-like authenticated denial
- **Fair Lotteries**: Verifiable random selection
- **Key Derivation**: Deterministic key generation with proofs

## Building from Source

[Building instructions]

## Security

This library uses the Bandersnatch curve with SHA-512, providing:

- 128-bit security level
- IETF VRF compliance (RFC 9381)
- Side-channel resistance through arkworks

## Contributing

[Contributing guidelines]

## License

MIT
````

## Implementation Timeline

### Week 1: Foundation

- [ ] Create examples directory structure
- [ ] Write basic examples (keypair, prove, verify)
- [ ] Update README.md with quick start
- [ ] Add building instructions

### Week 2: Advanced Examples

- [ ] Implement auxiliary data examples
- [ ] Create use case demonstrations
- [ ] Add TypeScript examples
- [ ] Write performance benchmarks

### Week 3: Integration & Polish

- [ ] Create Express.js API example
- [ ] Add React demo (if applicable)
- [ ] Complete examples README
- [ ] Add inline documentation to all examples
- [ ] Create troubleshooting guide

## Documentation Standards

Each example should include:

1. **Header comment** explaining what it demonstrates
2. **Step-by-step comments** for complex operations
3. **Expected output** examples
4. **Common pitfalls** and how to avoid them
5. **Links to relevant documentation**

## Testing Examples

All examples should be:

- Self-contained and runnable
- Tested on multiple platforms (Linux, macOS, Windows)
- Include error handling
- Use realistic but safe example data
- Avoid hardcoded secrets in production examples

## Success Metrics

- [ ] All examples run without errors
- [ ] Documentation covers 100% of public API
- [ ] Examples demonstrate all major use cases
- [ ] New users can integrate library in < 30 minutes
- [ ] TypeScript definitions fully utilized
