# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Node.js native addon project using napi-rs, which allows writing high-performance native Node.js modules in Rust. The project binds the
ark-vrf Rust crate available on crates.io, providing Elliptic Curve VRF (Verifiable Random Function) to Node.js applications.

The `ctx` directory at the base of the project is for _context documents_. Store designs, worklogs, architectural details, and implementation plans
in this directory, typically in a markdown format.

The `ext` directory at the base of this project is for _external resources_. Dependencies of the project may be cloned here using the provided shell script
to grant easy, local access for reference purposes. These third party code bases should not be committed to git history, but are not .gitignore'd in order
to provide more convenient referencing of individual files with tools like `claude` code and `ripgrep`.

## Common Development Commands

### Build Commands

- `yarn build` - Build the native addon in release mode for the current platform
- `yarn build:debug` - Build the native addon in debug mode
- `napi build --platform --release` - Full build command with platform detection

### Testing

- `yarn test` - Run tests using AVA test framework
- Tests are located in `__test__/` directory
- Test configuration uses `@oxc-node/core/register` for TypeScript support

### Code Quality

- `yarn lint` - Run linting with oxlint
- `yarn format` - Run all formatters (Prettier, Rust fmt, TOML)
- `yarn format:prettier` - Format JS/TS/JSON/MD files
- `yarn format:rs` - Format Rust code with cargo fmt
- `yarn format:toml` - Format TOML files with taplo

### Publishing

- `yarn prepublishOnly` - Prepare package for npm publishing
- `yarn artifacts` - Generate native artifacts
- `yarn version` - Update package version

### Benchmarking

- `yarn bench` - Run benchmarks (located in `benchmark/` directory)

## Architecture

### Core Structure

The project bridges Rust and Node.js through napi-rs, specifically implementing VRF (Verifiable Random Function) functionality:

1. **Rust Native Code** (`src/lib.rs`): Implements VRF operations using the `ark-vrf` crate with the Bandersnatch curve. Provides four main functions:

   - `generateKeypairFromSeed`: Creates VRF keypairs from seed strings
   - `vrfProve`: Generates VRF proofs with optional auxiliary data
   - `vrfVerify`: Verifies VRF proofs against public keys
   - `vrfProofToHash`: Converts VRF proofs to hash outputs using SHA-512

2. **JavaScript Bindings** (`index.js`): Auto-generated loader that detects the platform/architecture and loads the appropriate native binary (`node-ark-vrf.[platform].node`). Supports multiple platforms including Windows, macOS, Linux (glibc/musl), Android, and FreeBSD.

3. **TypeScript Definitions** (`index.d.ts`): Provides type definitions for the VRF functions and the `VrfKeyPair` interface.

4. **Platform-Specific Binaries**: The build system generates platform-specific `.node` files that are distributed as optional dependencies through separate npm packages (see `npm/` directory).

### Key Dependencies

#### Rust Dependencies

- **ark-vrf**: Core VRF implementation using the Bandersnatch curve
- **ark-ff, ark-ec, ark-serialize, ark-std**: Arkworks ecosystem for elliptic curve cryptography
- **napi, napi-derive**: Rust-to-Node.js binding framework
- **sha2**: SHA-512 hashing for proof-to-hash conversion
- **hex**: Encoding/decoding for key and proof serialization

#### JavaScript Dependencies

- **AVA**: Test runner configured with TypeScript support
- **oxlint**: Fast linter for JavaScript/TypeScript
- **Prettier**: Code formatter for JS/TS/JSON/Markdown
- **taplo**: TOML formatter

### Build Process

1. Rust code is compiled to a native `.node` file using napi-build
2. TypeScript definitions are auto-generated from Rust code annotated with `#[napi]`
3. JavaScript bindings handle platform detection and binary loading
4. Platform-specific packages are published separately and referenced as optional dependencies

## VRF API Functions

The project exports four main VRF functions:

- **generateKeypairFromSeed(seed)**: Generates deterministic VRF keypairs from a seed string
- **vrfProve(secretKey, message, auxData?)**: Creates a VRF proof for a message
- **vrfVerify(publicKey, message, proof, auxData?)**: Verifies a VRF proof
- **vrfProofToHash(proof)**: Converts a VRF proof to its hash output

All keys and proofs are hex-encoded strings for easy serialization and storage.

## Testing Single Tests

To run a specific test file:

```bash
npx ava __test__/[filename].spec.ts
```

To run tests matching a pattern:

```bash
npx ava __test__/*.spec.ts --match "*pattern*"
```

## External Resources

The `ext/clone_external_resources.sh` script can be used to clone related repositories locally for reference:

- napi-rs/napi-rs - The core napi-rs framework
- napi-rs/package-template - The original template this project was based on
- davxy/ark-vrf - The Rust VRF implementation being wrapped
