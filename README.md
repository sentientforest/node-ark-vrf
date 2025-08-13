# node-ark-vrf

![https://github.com/sentientforest/node-ark-vrf/actions](https://github.com/sentientforest/node-ark-vrf/workflows/CI/badge.svg)

**High-performance Node.js bindings for Elliptic Curve VRF (Verifiable Random Functions) with Additional Data support.**

## Features

- 🔐 **Cryptographically Secure**: Based on the robust [ark-vrf](https://github.com/davxy/ark-vrf) Rust implementation
- ⚡ **High Performance**: Native Rust performance with Node.js convenience
- 🛡️ **IETF Compliant**: Follows [RFC 9381](https://datatracker.ietf.org/doc/rfc9381/) specifications
- 🔗 **Additional Data Binding**: Support for VRF-AD (auxiliary data)
- 🎯 **Production Ready**: Comprehensive test coverage and examples
- 🌐 **Cross-Platform**: Supports all major operating systems and architectures

## Installation

```sh
npm install node-ark-vrf
# or
yarn add node-ark-vrf
# or
pnpm add node-ark-vrf
```

## Quick Start

```javascript
const vrf = require('node-ark-vrf')

// Generate a keypair
const keypair = vrf.generateKeypairFromSeed('my-secret-seed')

// Create a VRF proof
const proof = vrf.vrfProve(keypair.secretKey, 'my-message')

// Verify the proof
const isValid = vrf.vrfVerify(keypair.publicKey, 'my-message', proof)
console.log('Proof is valid:', isValid) // true

// Get deterministic hash output
const hash = vrf.vrfProofToHash(proof)
console.log('VRF hash:', hash)
```

### TypeScript Usage

```typescript
import { generateKeypairFromSeed, vrfProve, vrfVerify, vrfProofToHash, VrfKeyPair } from 'node-ark-vrf'

const keypair: VrfKeyPair = generateKeypairFromSeed('my-secret-seed')
const proof: string = vrfProve(keypair.secretKey, 'my-message', 'optional-aux-data')
const isValid: boolean = vrfVerify(keypair.publicKey, 'my-message', proof, 'optional-aux-data')
```

## Examples

Comprehensive examples are available in the [`examples/`](./examples) directory:

- **Basic Usage**: Keypair generation, proving, and verification
- **Advanced Features**: Auxiliary data, batch operations, error handling
- **Real-World Applications**: Random beacons, leader election, lottery systems
- **TypeScript**: Full TypeScript support with type definitions
- **Integration**: Express.js API and React demos

See [examples/README.md](./examples/README.md) for detailed guides and tutorials.

## API Reference

### `generateKeypairFromSeed(seed: string): VrfKeyPair`

Generates a VRF keypair from a seed string.

- `seed`: A string used to deterministically generate the keypair
- Returns: `VrfKeyPair` containing hex-encoded `publicKey` and `secretKey`

### `vrfProve(secretKey: string, message: string, auxData?: string): string`

Generates a VRF proof for a message using the secret key.

- `secretKey`: Hex-encoded secret key from `VrfKeyPair`
- `message`: Message to generate proof for
- `auxData`: Optional auxiliary data to include in the proof
- Returns: Hex-encoded VRF proof

### `vrfVerify(publicKey: string, message: string, proof: string, auxData?: string): boolean`

Verifies a VRF proof using the public key.

- `publicKey`: Hex-encoded public key from `VrfKeyPair`
- `message`: Original message
- `proof`: Hex-encoded proof from `vrfProve`
- `auxData`: Optional auxiliary data (must match what was used in `vrfProve`)
- Returns: `true` if the proof is valid, `false` otherwise

### `vrfProofToHash(proof: string): string`

Converts a VRF proof to its hash output.

- `proof`: Hex-encoded proof from `vrfProve`
- Returns: Hex-encoded hash value

## Use Cases

VRFs are ideal for applications requiring verifiable randomness:

- **🎲 Consensus Protocols**: Leader election and committee selection in blockchain networks
- **🔀 Random Beacons**: Unbiasable distributed randomness for lotteries and gaming
- **🔒 Privacy-Preserving DNS**: NSEC5-like authenticated denial of existence
- **⚖️ Fair Lotteries**: Transparent and verifiable random selection
- **🔑 Key Derivation**: Deterministic key generation with cryptographic proofs
- **📊 Random Sampling**: Verifiable audit and survey sampling

## Cryptographic Suite

This library uses the **Bandersnatch curve** with **SHA-512** hash function and **Elligator2** encoding, providing:

- **128-bit security level**
- **IETF VRF compliance** ([RFC 9381](https://datatracker.ietf.org/doc/rfc9381/))
- **VRF with Additional Data (VRF-AD)** support
- **Side-channel resistance** through arkworks implementation

## Building from Source

### Prerequisites

- **Rust** (latest stable version)
- **Node.js** 14+ with npm/yarn
- **Python** 3.x (for node-gyp)
- **C++ build tools** (platform-specific)

### Build Steps

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
```

### Development Workflow

```bash
# Make changes to Rust code (src/lib.rs)
yarn build

# Test your changes
yarn test

# Try examples
node examples/basic/01-keypair-generation.js
```

### Using Locally in Your Project

#### Method 1: npm link (recommended)

```bash
# In the node-ark-vrf directory
npm link

# In your project directory
npm link node-ark-vrf
```

#### Method 2: Local file reference

```json
{
  "dependencies": {
    "node-ark-vrf": "file:../path/to/node-ark-vrf"
  }
}
```

## Support Matrix

### Operating Systems

|                  | node14 | node16 | node18 | node20 |
| ---------------- | ------ | ------ | ------ | ------ |
| Windows x64      | ✓      | ✓      | ✓      | ✓      |
| Windows x32      | ✓      | ✓      | ✓      | ✓      |
| Windows arm64    | ✓      | ✓      | ✓      | ✓      |
| macOS x64        | ✓      | ✓      | ✓      | ✓      |
| macOS arm64      | ✓      | ✓      | ✓      | ✓      |
| Linux x64 gnu    | ✓      | ✓      | ✓      | ✓      |
| Linux x64 musl   | ✓      | ✓      | ✓      | ✓      |
| Linux arm gnu    | ✓      | ✓      | ✓      | ✓      |
| Linux arm64 gnu  | ✓      | ✓      | ✓      | ✓      |
| Linux arm64 musl | ✓      | ✓      | ✓      | ✓      |
| Android arm64    | ✓      | ✓      | ✓      | ✓      |
| Android armv7    | ✓      | ✓      | ✓      | ✓      |
| FreeBSD x64      | ✓      | ✓      | ✓      | ✓      |

## Security Considerations

- **Key Management**: Never hardcode secret keys in production code. Use environment variables or secure key management systems.
- **Side-Channel Protection**: The underlying ark-vrf implementation includes protections against timing attacks.
- **Randomness Quality**: VRF outputs are cryptographically secure but deterministic. Use appropriate entropy sources for key generation.
- **Auxiliary Data**: Always use auxiliary data when context binding is required for security.

## Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Setup

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Ensure all tests pass: `yarn test`
6. Submit a pull request

## Troubleshooting

### Common Issues

**"Cannot find module 'node-ark-vrf'"**

```bash
# Make sure the library is built
yarn build
```

**"Invalid key format"**

- Ensure keys are hex-encoded strings
- Check that you're not passing raw bytes

**"Verification failed"**

- Verify you're using the correct public key
- Ensure the message and auxiliary data match exactly

### Getting Help

- Check the [examples/](./examples) directory for usage patterns
- Review the [API documentation](#api-reference)
- Open an issue on [GitHub](https://github.com/sentientforest/node-ark-vrf/issues)

## Related Projects

- [ark-vrf](https://github.com/davxy/ark-vrf) - The underlying Rust VRF implementation
- [RFC 9381](https://datatracker.ietf.org/doc/rfc9381/) - IETF VRF specification
- [arkworks](https://github.com/arkworks-rs) - Rust ecosystem for zero-knowledge cryptography

## License

MIT License - see [LICENSE](LICENSE) file for details.
