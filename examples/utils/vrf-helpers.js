#!/usr/bin/env node

/**
 * VRF Utility Helpers
 *
 * This module provides high-level utility functions and classes
 * to simplify common VRF operations and patterns.
 *
 * Features:
 * - Simplified VRF operations with error handling
 * - Batch processing utilities
 * - Key management helpers
 * - Validation and formatting functions
 *
 * Usage:
 * const { VrfSigner, VrfVerifier, BatchProcessor } = require('./vrf-helpers');
 */

const vrf = require('../../index')
const crypto = require('crypto')

/**
 * Simplified VRF signer with built-in error handling
 */
class VrfSigner {
  constructor(seed) {
    if (!seed || typeof seed !== 'string') {
      throw new Error('Valid seed string required')
    }

    try {
      this.keypair = vrf.generateKeypairFromSeed(seed)
    } catch (error) {
      throw new Error(`Failed to generate keypair: ${error.message}`)
    }
  }

  /**
   * Sign a message with optional auxiliary data
   */
  sign(message, auxData = null) {
    if (!message || typeof message !== 'string') {
      throw new Error('Valid message string required')
    }

    try {
      const proof = vrf.vrfProve(this.keypair.secretKey, message, auxData)
      const hash = vrf.vrfProofToHash(proof)

      return {
        message,
        proof,
        hash,
        auxData,
        publicKey: this.keypair.publicKey,
        timestamp: Date.now(),
      }
    } catch (error) {
      throw new Error(`Failed to sign message: ${error.message}`)
    }
  }

  /**
   * Generate a random value for the given input
   */
  random(input, auxData = null) {
    const result = this.sign(input, auxData)
    return result.hash
  }

  /**
   * Get the public key
   */
  getPublicKey() {
    return this.keypair.publicKey
  }

  /**
   * Create a child signer with derived key
   */
  derive(path) {
    const childSeed = `${this.keypair.publicKey}:${path}`
    return new VrfSigner(childSeed)
  }
}

/**
 * VRF verifier with simplified interface
 */
class VrfVerifier {
  /**
   * Verify a VRF signature result
   */
  static verify(signatureResult) {
    try {
      return vrf.vrfVerify(
        signatureResult.publicKey,
        signatureResult.message,
        signatureResult.proof,
        signatureResult.auxData,
      )
    } catch (error) {
      console.error('Verification error:', error.message)
      return false
    }
  }

  /**
   * Verify with explicit parameters
   */
  static verifyExplicit(publicKey, message, proof, auxData = null) {
    try {
      return vrf.vrfVerify(publicKey, message, proof, auxData)
    } catch (error) {
      console.error('Verification error:', error.message)
      return false
    }
  }

  /**
   * Batch verify multiple signatures
   */
  static batchVerify(signatureResults) {
    const results = signatureResults.map((result) => ({
      ...result,
      valid: this.verify(result),
    }))

    const allValid = results.every((r) => r.valid)
    const validCount = results.filter((r) => r.valid).length

    return {
      allValid,
      validCount,
      totalCount: results.length,
      results,
    }
  }
}

/**
 * Batch processor for high-throughput VRF operations
 */
class BatchProcessor {
  constructor(signer) {
    this.signer = signer
  }

  /**
   * Process multiple messages in batch
   */
  signBatch(messages, auxDataFn = null) {
    return messages.map((message, index) => {
      const auxData = auxDataFn ? auxDataFn(message, index) : null
      return this.signer.sign(message, auxData)
    })
  }

  /**
   * Generate multiple random values
   */
  randomBatch(inputs, auxDataFn = null) {
    return this.signBatch(inputs, auxDataFn).map((result) => ({
      input: result.message,
      random: result.hash,
      proof: result.proof,
    }))
  }

  /**
   * Process items with custom mapping function
   */
  processBatch(items, mapFn, auxDataFn = null) {
    return items.map((item, index) => {
      const message = mapFn(item, index)
      const auxData = auxDataFn ? auxDataFn(item, index) : null
      const signature = this.signer.sign(message, auxData)

      return {
        item,
        message,
        signature,
        random: signature.hash,
      }
    })
  }
}

/**
 * Key derivation utilities
 */
class KeyDerivation {
  constructor(masterSeed) {
    this.masterSeed = masterSeed
    this.cache = new Map()
  }

  /**
   * Derive a key from a hierarchical path
   */
  deriveKey(path) {
    const pathString = Array.isArray(path) ? path.join('/') : path

    if (this.cache.has(pathString)) {
      return this.cache.get(pathString)
    }

    const seed = `${this.masterSeed}:${pathString}`
    const signer = new VrfSigner(seed)
    this.cache.set(pathString, signer)

    return signer
  }

  /**
   * Clear the key cache
   */
  clearCache() {
    this.cache.clear()
  }

  /**
   * Get cache size
   */
  getCacheSize() {
    return this.cache.size
  }
}

/**
 * Random beacon utilities
 */
class BeaconGenerator {
  constructor(seed, beaconId) {
    this.signer = new VrfSigner(seed)
    this.beaconId = beaconId
    this.history = []
  }

  /**
   * Generate a beacon for the given epoch
   */
  generateBeacon(epoch) {
    const previousHash = this.history.length > 0 ? this.history[this.history.length - 1].randomness : null

    const input = `beacon:${this.beaconId}:epoch:${epoch}:prev:${previousHash || 'genesis'}`
    const auxData = JSON.stringify({
      beaconId: this.beaconId,
      epoch,
      previousHash,
      timestamp: Date.now(),
    })

    const signature = this.signer.sign(input, auxData)

    const beacon = {
      beaconId: this.beaconId,
      epoch,
      randomness: signature.hash,
      proof: signature.proof,
      publicKey: signature.publicKey,
      timestamp: signature.timestamp,
    }

    this.history.push(beacon)
    return beacon
  }

  /**
   * Verify a beacon
   */
  verifyBeacon(beacon) {
    const expectedInput = `beacon:${beacon.beaconId}:epoch:${beacon.epoch}:prev:${beacon.previousHash || 'genesis'}`
    const auxData = JSON.stringify({
      beaconId: beacon.beaconId,
      epoch: beacon.epoch,
      previousHash: beacon.previousHash,
      timestamp: beacon.timestamp,
    })

    return VrfVerifier.verifyExplicit(beacon.publicKey, expectedInput, beacon.proof, auxData)
  }

  /**
   * Get beacon history
   */
  getHistory() {
    return [...this.history]
  }
}

/**
 * Validation utilities
 */
class VrfValidator {
  /**
   * Validate a VRF public key format
   */
  static isValidPublicKey(publicKey) {
    if (typeof publicKey !== 'string') return false
    if (!/^[0-9a-fA-F]+$/.test(publicKey)) return false
    return publicKey.length === 64 // Expected length for hex-encoded key
  }

  /**
   * Validate a VRF proof format
   */
  static isValidProof(proof) {
    if (typeof proof !== 'string') return false
    if (!/^[0-9a-fA-F]+$/.test(proof)) return false
    return proof.length > 0 // Non-empty hex string
  }

  /**
   * Validate a VRF hash format
   */
  static isValidHash(hash) {
    if (typeof hash !== 'string') return false
    if (!/^[0-9a-fA-F]+$/.test(hash)) return false
    return hash.length === 64 // SHA-256 hash length
  }

  /**
   * Validate a complete VRF signature result
   */
  static isValidSignatureResult(result) {
    if (!result || typeof result !== 'object') return false

    return (
      typeof result.message === 'string' &&
      this.isValidProof(result.proof) &&
      this.isValidHash(result.hash) &&
      this.isValidPublicKey(result.publicKey) &&
      typeof result.timestamp === 'number'
    )
  }
}

/**
 * Formatting utilities
 */
class VrfFormatter {
  /**
   * Format a hash for display
   */
  static formatHash(hash, length = 16) {
    if (!hash || typeof hash !== 'string') return 'invalid'
    return hash.length > length ? `${hash.substring(0, length)}...` : hash
  }

  /**
   * Format a public key for display
   */
  static formatPublicKey(publicKey, length = 16) {
    return this.formatHash(publicKey, length)
  }

  /**
   * Format a proof for display
   */
  static formatProof(proof, length = 32) {
    return this.formatHash(proof, length)
  }

  /**
   * Format a signature result for logging
   */
  static formatSignatureResult(result) {
    if (!VrfValidator.isValidSignatureResult(result)) {
      return 'Invalid signature result'
    }

    return {
      message: result.message.length > 50 ? `${result.message.substring(0, 50)}...` : result.message,
      hash: this.formatHash(result.hash),
      publicKey: this.formatPublicKey(result.publicKey),
      timestamp: new Date(result.timestamp).toISOString(),
      hasAuxData: !!result.auxData,
    }
  }
}

/**
 * Error handling utilities
 */
class VrfError extends Error {
  constructor(message, code = 'VRF_ERROR', details = null) {
    super(message)
    this.name = 'VrfError'
    this.code = code
    this.details = details
  }
}

/**
 * Safe operations with error handling
 */
class SafeVrfOperations {
  /**
   * Safely generate a keypair
   */
  static safeGenerateKeypair(seed) {
    try {
      return { success: true, data: new VrfSigner(seed) }
    } catch (error) {
      return {
        success: false,
        error: new VrfError(`Keypair generation failed: ${error.message}`, 'KEYGEN_FAILED', error),
      }
    }
  }

  /**
   * Safely sign a message
   */
  static safeSign(signer, message, auxData = null) {
    try {
      return { success: true, data: signer.sign(message, auxData) }
    } catch (error) {
      return {
        success: false,
        error: new VrfError(`Signing failed: ${error.message}`, 'SIGN_FAILED', error),
      }
    }
  }

  /**
   * Safely verify a signature
   */
  static safeVerify(signatureResult) {
    try {
      const isValid = VrfVerifier.verify(signatureResult)
      return { success: true, data: isValid }
    } catch (error) {
      return {
        success: false,
        error: new VrfError(`Verification failed: ${error.message}`, 'VERIFY_FAILED', error),
      }
    }
  }
}

/**
 * Utility functions
 */
const VrfUtils = {
  /**
   * Generate a secure random seed
   */
  generateSecureSeed(length = 32) {
    return crypto.randomBytes(length).toString('hex')
  },

  /**
   * Create a deterministic seed from components
   */
  createDeterministicSeed(components) {
    return components.join(':')
  },

  /**
   * Convert hash to number in range [0, max)
   */
  hashToNumber(hash, max) {
    const hashBigInt = BigInt('0x' + hash.substring(0, 16))
    return Number(hashBigInt % BigInt(max))
  },

  /**
   * Select random item from array using VRF
   */
  selectRandom(items, hash) {
    if (!items.length) return null
    const index = this.hashToNumber(hash, items.length)
    return items[index]
  },

  /**
   * Shuffle array using VRF hash as seed
   */
  shuffleArray(items, hash) {
    const shuffled = [...items]
    let seed = hash

    for (let i = shuffled.length - 1; i > 0; i--) {
      seed = crypto.createHash('sha256').update(seed).digest('hex')
      const j = this.hashToNumber(seed, i + 1)
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }

    return shuffled
  },

  /**
   * Generate multiple unique random numbers
   */
  generateUniqueNumbers(count, max, hash) {
    const numbers = new Set()
    let seed = hash

    while (numbers.size < count && numbers.size < max) {
      seed = crypto.createHash('sha256').update(seed).digest('hex')
      const num = this.hashToNumber(seed, max)
      numbers.add(num)
    }

    return Array.from(numbers)
  },
}

module.exports = {
  VrfSigner,
  VrfVerifier,
  BatchProcessor,
  KeyDerivation,
  BeaconGenerator,
  VrfValidator,
  VrfFormatter,
  VrfError,
  SafeVrfOperations,
  VrfUtils,
}
