#!/usr/bin/env npx ts-node

/**
 * TypeScript VRF Basic Usage Example
 *
 * This example demonstrates:
 * - Type-safe VRF operations with TypeScript
 * - Proper interface definitions and usage
 * - Error handling with typed exceptions
 * - Best practices for TypeScript VRF applications
 *
 * Run with: npx ts-node basic-usage.ts
 * Or compile: npx tsc basic-usage.ts && node basic-usage.js
 */

import { generateKeypairFromSeed, vrfProve, vrfVerify, vrfProofToHash, VrfKeyPair } from '../../index'

console.log('=== TypeScript VRF Basic Usage ===\n')

// Define interfaces for our application
interface VrfMessage {
  id: string
  content: string
  timestamp: number
  metadata?: Record<string, any>
}

interface VrfProofResult {
  message: VrfMessage
  proof: string
  hash: string
  publicKey: string
  valid: boolean
}

interface BeaconOutput {
  epoch: number
  randomness: string
  proof: string
  publicKey: string
  timestamp: number
}

/**
 * Type-safe VRF Signer class
 */
class VrfSigner {
  private readonly keypair: VrfKeyPair
  private readonly signerName: string

  constructor(seed: string, signerName: string = 'anonymous') {
    this.keypair = generateKeypairFromSeed(seed)
    this.signerName = signerName
  }

  /**
   * Sign a message and return a typed result
   */
  signMessage(message: VrfMessage, auxData?: string): VrfProofResult {
    try {
      const input = JSON.stringify(message)
      const proof = vrfProve(this.keypair.secretKey, input, auxData)
      const hash = vrfProofToHash(proof)
      const valid = vrfVerify(this.keypair.publicKey, input, proof, auxData)

      return {
        message,
        proof,
        hash,
        publicKey: this.keypair.publicKey,
        valid,
      }
    } catch (error) {
      throw new Error(`Failed to sign message: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Generate a time-based beacon
   */
  generateBeacon(epoch: number): BeaconOutput {
    const input = `beacon:${this.signerName}:epoch:${epoch}`
    const auxData = JSON.stringify({
      signer: this.signerName,
      epoch,
      timestamp: Date.now(),
      purpose: 'time-beacon',
    })

    try {
      const proof = vrfProve(this.keypair.secretKey, input, auxData)
      const randomness = vrfProofToHash(proof)

      return {
        epoch,
        randomness,
        proof,
        publicKey: this.keypair.publicKey,
        timestamp: Date.now(),
      }
    } catch (error) {
      throw new Error(`Failed to generate beacon: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get the public key
   */
  getPublicKey(): string {
    return this.keypair.publicKey
  }

  /**
   * Get signer name
   */
  getName(): string {
    return this.signerName
  }
}

/**
 * Type-safe VRF Verifier class
 */
class VrfVerifier {
  private readonly verifierName: string

  constructor(verifierName: string = 'verifier') {
    this.verifierName = verifierName
  }

  /**
   * Verify a signed message
   */
  verifySignedMessage(result: VrfProofResult, auxData?: string): boolean {
    try {
      const input = JSON.stringify(result.message)
      return vrfVerify(result.publicKey, input, result.proof, auxData)
    } catch (error) {
      console.error(`Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return false
    }
  }

  /**
   * Verify a beacon output
   */
  verifyBeacon(beacon: BeaconOutput, signerName: string): boolean {
    try {
      const input = `beacon:${signerName}:epoch:${beacon.epoch}`
      const auxData = JSON.stringify({
        signer: signerName,
        epoch: beacon.epoch,
        timestamp: beacon.timestamp,
        purpose: 'time-beacon',
      })

      const proofValid = vrfVerify(beacon.publicKey, input, beacon.proof, auxData)
      const hashValid = vrfProofToHash(beacon.proof) === beacon.randomness

      return proofValid && hashValid
    } catch (error) {
      console.error(`Beacon verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return false
    }
  }

  /**
   * Batch verify multiple proofs
   */
  batchVerify(results: VrfProofResult[], auxData?: string): { valid: boolean; details: boolean[] } {
    const details = results.map((result) => this.verifySignedMessage(result, auxData))
    const valid = details.every((d) => d)

    return { valid, details }
  }
}

// Example 1: Basic typed operations
console.log('1. Basic TypeScript VRF Operations:')

const signer = new VrfSigner('typescript-example-seed', 'alice')
const verifier = new VrfVerifier('bob')

console.log(`Signer: ${signer.getName()}`)
console.log(`Public Key: ${signer.getPublicKey().substring(0, 32)}...`)

// Create a typed message
const message: VrfMessage = {
  id: 'msg-001',
  content: 'Hello, TypeScript VRF!',
  timestamp: Date.now(),
  metadata: {
    version: '1.0',
    importance: 'high',
  },
}

// Sign the message
const signedResult = signer.signMessage(message)
console.log(`Message signed: ${signedResult.valid}`)
console.log(`Proof: ${signedResult.proof.substring(0, 32)}...`)
console.log(`Hash: ${signedResult.hash.substring(0, 32)}...`)

// Verify the signature
const isValid = verifier.verifySignedMessage(signedResult)
console.log(`Verification result: ${isValid}`)

// Example 2: Auxiliary data with types
console.log('\n2. Auxiliary Data with Type Safety:')

interface AuxiliaryContext {
  sessionId: string
  userId: string
  permissions: string[]
  expiresAt: number
}

const context: AuxiliaryContext = {
  sessionId: 'session-12345',
  userId: 'user-alice',
  permissions: ['read', 'write'],
  expiresAt: Date.now() + 3600000, // 1 hour
}

const contextMessage: VrfMessage = {
  id: 'auth-001',
  content: 'authentication-token',
  timestamp: Date.now(),
}

const auxData = JSON.stringify(context)
const contextResult = signer.signMessage(contextMessage, auxData)
const contextValid = verifier.verifySignedMessage(contextResult, auxData)

console.log(`Context message: ${contextMessage.content}`)
console.log(`Session ID: ${context.sessionId}`)
console.log(`With context valid: ${contextValid}`)

// Verify fails without context
const withoutContextValid = verifier.verifySignedMessage(contextResult)
console.log(`Without context valid: ${withoutContextValid}`)

// Example 3: Beacon generation with types
console.log('\n3. Type-safe Beacon Generation:')

interface BeaconSchedule {
  startEpoch: number
  endEpoch: number
  interval: number
}

class TypedBeaconGenerator {
  private signer: VrfSigner
  private schedule: BeaconSchedule

  constructor(seed: string, name: string, schedule: BeaconSchedule) {
    this.signer = new VrfSigner(seed, name)
    this.schedule = schedule
  }

  generateScheduledBeacons(): BeaconOutput[] {
    const beacons: BeaconOutput[] = []

    for (let epoch = this.schedule.startEpoch; epoch <= this.schedule.endEpoch; epoch += this.schedule.interval) {
      try {
        const beacon = this.signer.generateBeacon(epoch)
        beacons.push(beacon)
      } catch (error) {
        console.error(`Failed to generate beacon for epoch ${epoch}:`, error)
      }
    }

    return beacons
  }

  verifyBeaconChain(beacons: BeaconOutput[]): boolean {
    const verifier = new VrfVerifier()
    return beacons.every((beacon) => verifier.verifyBeacon(beacon, this.signer.getName()))
  }
}

const beaconSchedule: BeaconSchedule = {
  startEpoch: 1,
  endEpoch: 5,
  interval: 1,
}

const beaconGenerator = new TypedBeaconGenerator('beacon-generator-seed', 'beacon-alice', beaconSchedule)

const beacons = beaconGenerator.generateScheduledBeacons()
const beaconChainValid = beaconGenerator.verifyBeaconChain(beacons)

console.log(`Generated ${beacons.length} beacons`)
console.log(`Beacon chain valid: ${beaconChainValid}`)

beacons.forEach((beacon, index) => {
  console.log(`  Epoch ${beacon.epoch}: ${beacon.randomness.substring(0, 16)}...`)
})

// Example 4: Error handling with types
console.log('\n4. Type-safe Error Handling:')

type VrfResult<T> =
  | {
      success: true
      data: T
    }
  | {
      success: false
      error: string
    }

class SafeVrfOperations {
  static safeGenerateKeypair(seed: string): VrfResult<VrfKeyPair> {
    try {
      const keypair = generateKeypairFromSeed(seed)
      return { success: true, data: keypair }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  static safeProve(secretKey: string, message: string, auxData?: string): VrfResult<string> {
    try {
      const proof = vrfProve(secretKey, message, auxData)
      return { success: true, data: proof }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  static safeVerify(publicKey: string, message: string, proof: string, auxData?: string): VrfResult<boolean> {
    try {
      const valid = vrfVerify(publicKey, message, proof, auxData)
      return { success: true, data: valid }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }
}

// Test safe operations
const safeKeypair = SafeVrfOperations.safeGenerateKeypair('safe-test-seed')
if (safeKeypair.success) {
  console.log(`Safe keypair generated: ${safeKeypair.data.publicKey.substring(0, 32)}...`)

  const safeProof = SafeVrfOperations.safeProve(safeKeypair.data.secretKey, 'safe-message')
  if (safeProof.success) {
    console.log(`Safe proof generated: ${safeProof.data.substring(0, 32)}...`)

    const safeVerification = SafeVrfOperations.safeVerify(safeKeypair.data.publicKey, 'safe-message', safeProof.data)

    if (safeVerification.success) {
      console.log(`Safe verification result: ${safeVerification.data}`)
    } else {
      console.error(`Verification error: ${safeVerification.error}`)
    }
  } else {
    console.error(`Proof generation error: ${safeProof.error}`)
  }
} else {
  console.error(`Keypair generation error: ${safeKeypair.error}`)
}

// Test error cases
const invalidProof = SafeVrfOperations.safeProve('invalid-key', 'test')
if (!invalidProof.success) {
  console.log(`✓ Invalid key properly caught: ${invalidProof.error}`)
}

// Example 5: Generic VRF utilities
console.log('\n5. Generic TypeScript Utilities:')

interface VrfConfig {
  seedPrefix: string
  defaultAuxData?: string
  validateInputs?: boolean
}

class VrfUtils {
  static createDeterministicSeed(base: string, ...components: (string | number)[]): string {
    return `${base}:${components.join(':')}`
  }

  static generateDerivedKeypair(masterSeed: string, derivationPath: string[]): VrfKeyPair {
    const seed = this.createDeterministicSeed(masterSeed, ...derivationPath)
    return generateKeypairFromSeed(seed)
  }

  static batchGenerate<T extends Record<string, any>>(
    items: T[],
    secretKey: string,
    keyExtractor: (item: T) => string,
    auxDataExtractor?: (item: T) => string,
  ): Array<T & { proof: string; hash: string }> {
    return items.map((item) => {
      const message = keyExtractor(item)
      const auxData = auxDataExtractor ? auxDataExtractor(item) : undefined
      const proof = vrfProve(secretKey, message, auxData)
      const hash = vrfProofToHash(proof)

      return { ...item, proof, hash }
    })
  }
}

// Test utilities
interface DataItem {
  id: number
  name: string
  value: number
}

const masterSeed = 'utility-master-seed'
const derivedKeypair = VrfUtils.generateDerivedKeypair(masterSeed, ['test', 'environment', 'batch'])

const testData: DataItem[] = [
  { id: 1, name: 'item-one', value: 100 },
  { id: 2, name: 'item-two', value: 200 },
  { id: 3, name: 'item-three', value: 300 },
]

const batchResults = VrfUtils.batchGenerate(
  testData,
  derivedKeypair.secretKey,
  (item) => `item:${item.id}:${item.name}`,
  (item) => JSON.stringify({ value: item.value, batch: true }),
)

console.log('Batch processing results:')
batchResults.forEach((result) => {
  console.log(`  ${result.name}: ${result.hash.substring(0, 16)}... (value: ${result.value})`)
})

console.log('\n=== Summary ===\n')
console.log('• TypeScript provides excellent type safety for VRF operations')
console.log('• Interfaces help define clear contracts for VRF data structures')
console.log('• Generic utilities enable reusable VRF functionality')
console.log('• Proper error handling prevents runtime failures')
console.log('• Type-safe auxiliary data ensures consistency')
