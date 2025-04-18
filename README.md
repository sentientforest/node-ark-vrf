# `node-ark-vrf`

![https://github.com/sentientforest/node-ark-vrf/actions](https://github.com/sentientforest/node-ark-vrf/workflows/CI/badge.svg)

> Elliptic Curve VRF. Node.js bindings for the ark-vrf Rust crate available on crates.io.

- Generate VRF keypairs from seeds
- Generate VRF proofs with optional auxiliary data
- Verify VRF proofs
- Convert VRF proofs to hash outputs
- Built on the robust ark-vrf Rust crate
- Uses the Bandersnatch curve for optimal performance and security

## Installation

```sh
npm install node-ark-vrf
# or
yarn add node-ark-vrf
# or
pnpm add node-ark-vrf
```

## Usage

```typescript
import { generateKeypairFromSeed, vrfProve, vrfVerify, vrfProofToHash } from 'node-ark-vrf'

// Generate a keypair from a seed
const keypair = generateKeypairFromSeed('my seed')

// Generate a VRF proof
const message = 'message to prove'
const auxData = 'optional auxiliary data'
const proof = vrfProve(keypair.secretKey, message, auxData)

// Verify the proof
const isValid = vrfVerify(keypair.publicKey, message, proof, auxData)
console.log('Proof is valid:', isValid)

// Get the hash output from the proof
const hash = vrfProofToHash(proof)
console.log('VRF hash output:', hash)
```

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

## Support Matrix

### Operating Systems

|                  | node14 | node16 | node18 | node20 |
| ---------------- | ------ | ------ | ------ | ------ |
| Windows x64      | ✓      | ✓      | ✓      | ✓      |
| Windows x32      | ✓      | ✓      | ✓      | ✓      |
| Windows arm64    | ✓      | ✓      | ✓      | ✓      |
| macOS x64       | ✓      | ✓      | ✓      | ✓      |
| macOS arm64     | ✓      | ✓      | ✓      | ✓      |
| Linux x64 gnu    | ✓      | ✓      | ✓      | ✓      |
| Linux x64 musl   | ✓      | ✓      | ✓      | ✓      |
| Linux arm gnu    | ✓      | ✓      | ✓      | ✓      |
| Linux arm64 gnu  | ✓      | ✓      | ✓      | ✓      |
| Linux arm64 musl | ✓      | ✓      | ✓      | ✓      |
| Android arm64    | ✓      | ✓      | ✓      | ✓      |
| Android armv7    | ✓      | ✓      | ✓      | ✓      |
| FreeBSD x64      | ✓      | ✓      | ✓      | ✓      |

## License

MIT
### Test

With [ava](https://github.com/avajs/ava), run `yarn test/npm run test` to testing native addon. You can also switch to another testing framework if you want.

### CI

With GitHub Actions, each commit and pull request will be built and tested automatically in [`node@14`, `node@16`, `@node18`] x [`macOS`, `Linux`, `Windows`] matrix. 

### Release

Release native package is very difficult in old days. Native packages may ask developers who use it to install `build toolchain` like `gcc/llvm`, `node-gyp` or something more.

With `GitHub actions`, we can easily prebuild a `binary` for major platforms. And with `N-API`, we should never be afraid of **ABI Compatible**.

The other problem is how to deliver prebuild `binary` to users. Downloading it in `postinstall` script is a common way that most packages do it right now. The problem with this solution is it introduced many other packages to download binary that has not been used by `runtime codes`. The other problem is some users may not easily download the binary from `GitHub/CDN` if they are behind a private network (But in most cases, they have a private NPM mirror).

In this package, we choose a better way to solve this problem. We release different `npm packages` for different platforms. And add it to `optionalDependencies` before releasing the `Major` package to npm.

`NPM` will choose which native package should download from `registry` automatically. You can see [npm](./npm) dir for details. And you can also run `yarn add @napi-rs/package-template` to see how it works.

## Develop requirements

- Install the latest `Rust`
- Install `Node.js@10+` which fully supported `Node-API`
- Install `yarn@1.x`

## Test in local

- yarn
- yarn build
- yarn test

And you will see:

```bash
$ ava --verbose

  ✔ sync function from native code
  ✔ sleep function from native code (201ms)
  ─

  2 tests passed
✨  Done in 1.12s.
```

## Release package

Ensure you have set your **NPM_TOKEN** in the `GitHub` project setting.

In `Settings -> Secrets`, add **NPM_TOKEN** into it.

When you want to release the package:

```
npm version [<newversion> | major | minor | patch | premajor | preminor | prepatch | prerelease [--preid=<prerelease-id>] | from-git]

git push
```

GitHub actions will do the rest job for you.
