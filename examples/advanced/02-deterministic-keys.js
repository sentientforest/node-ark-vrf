#!/usr/bin/env node

/**
 * Deterministic Key Derivation Example
 *
 * This example demonstrates:
 * - Deriving multiple keys from a master seed
 * - Hierarchical deterministic key generation
 * - Key isolation and context separation
 *
 * Run with: node 02-deterministic-keys.js
 */

const vrf = require('../../index')
const crypto = require('crypto')

console.log('=== Deterministic Key Derivation Example ===\n')

// Example 1: Basic key derivation from master seed
console.log('1. Master seed key derivation:')
const masterSeed = 'master-seed-phrase-very-secure'

// Derive different keys for different purposes
const userKeys = vrf.generateKeypairFromSeed(`${masterSeed}:user-auth`)
const sessionKeys = vrf.generateKeypairFromSeed(`${masterSeed}:session-management`)
const auditKeys = vrf.generateKeypairFromSeed(`${masterSeed}:audit-logging`)

console.log('Master seed:', masterSeed)
console.log('User auth public key:', userKeys.publicKey.substring(0, 32) + '...')
console.log('Session mgmt public key:', sessionKeys.publicKey.substring(0, 32) + '...')
console.log('Audit log public key:', auditKeys.publicKey.substring(0, 32) + '...')

// Verify keys are different
console.log(
  'Keys are different:',
  userKeys.publicKey !== sessionKeys.publicKey && sessionKeys.publicKey !== auditKeys.publicKey,
)

// Example 2: Hierarchical key derivation
console.log('\n2. Hierarchical key derivation:')
class KeyDerivation {
  constructor(masterSeed) {
    this.masterSeed = masterSeed
    this.cache = new Map()
  }

  deriveKey(path) {
    const pathKey = path.join('/')
    if (this.cache.has(pathKey)) {
      return this.cache.get(pathKey)
    }

    const seed = `${this.masterSeed}:${pathKey}`
    const keypair = vrf.generateKeypairFromSeed(seed)
    this.cache.set(pathKey, keypair)
    return keypair
  }

  deriveUserKey(userId) {
    return this.deriveKey(['users', userId])
  }

  deriveSessionKey(userId, sessionId) {
    return this.deriveKey(['users', userId, 'sessions', sessionId])
  }

  deriveServiceKey(serviceName, environment) {
    return this.deriveKey(['services', serviceName, environment])
  }
}

const keyDeriver = new KeyDerivation('enterprise-master-seed')

// Generate keys for different users
const alice = keyDeriver.deriveUserKey('alice')
const bob = keyDeriver.deriveUserKey('bob')

console.log("Alice's key:", alice.publicKey.substring(0, 32) + '...')
console.log("Bob's key:", bob.publicKey.substring(0, 32) + '...')

// Generate session keys
const aliceSession1 = keyDeriver.deriveSessionKey('alice', 'session-001')
const aliceSession2 = keyDeriver.deriveSessionKey('alice', 'session-002')

console.log('Alice session 1:', aliceSession1.publicKey.substring(0, 32) + '...')
console.log('Alice session 2:', aliceSession2.publicKey.substring(0, 32) + '...')

// Service keys
const prodAPI = keyDeriver.deriveServiceKey('api-gateway', 'production')
const stagingAPI = keyDeriver.deriveServiceKey('api-gateway', 'staging')

console.log('Production API key:', prodAPI.publicKey.substring(0, 32) + '...')
console.log('Staging API key:', stagingAPI.publicKey.substring(0, 32) + '...')

// Example 3: Time-based key rotation
console.log('\n3. Time-based key rotation:')
class RotatingKeys {
  constructor(masterSeed, rotationInterval = 3600000) {
    // 1 hour default
    this.masterSeed = masterSeed
    this.rotationInterval = rotationInterval
  }

  getCurrentEpoch() {
    return Math.floor(Date.now() / this.rotationInterval)
  }

  getKeyForEpoch(epoch, context = 'default') {
    const seed = `${this.masterSeed}:epoch:${epoch}:context:${context}`
    return vrf.generateKeypairFromSeed(seed)
  }

  getCurrentKey(context = 'default') {
    return this.getKeyForEpoch(this.getCurrentEpoch(), context)
  }

  getPreviousKey(context = 'default') {
    return this.getKeyForEpoch(this.getCurrentEpoch() - 1, context)
  }

  getNextKey(context = 'default') {
    return this.getKeyForEpoch(this.getCurrentEpoch() + 1, context)
  }

  generateBeacon(epoch = null) {
    const targetEpoch = epoch || this.getCurrentEpoch()
    const key = this.getKeyForEpoch(targetEpoch)
    const message = `beacon:${targetEpoch}`
    const proof = vrf.vrfProve(key.secretKey, message)
    const hash = vrf.vrfProofToHash(proof)

    return {
      epoch: targetEpoch,
      publicKey: key.publicKey,
      proof,
      hash,
      timestamp: Date.now(),
    }
  }
}

const rotatingBeacon = new RotatingKeys('time-based-beacon-seed')
const currentEpoch = rotatingBeacon.getCurrentEpoch()

console.log('Current epoch:', currentEpoch)
console.log('Current key:', rotatingBeacon.getCurrentKey().publicKey.substring(0, 32) + '...')
console.log('Previous key:', rotatingBeacon.getPreviousKey().publicKey.substring(0, 32) + '...')

// Generate beacon for current epoch
const beacon = rotatingBeacon.generateBeacon()
console.log('Current beacon hash:', beacon.hash.substring(0, 32) + '...')

// Example 4: Organization-based key management
console.log('\n4. Organization key management:')
class OrganizationKeys {
  constructor(orgSeed) {
    this.orgSeed = orgSeed
  }

  getDepartmentKey(department) {
    return vrf.generateKeypairFromSeed(`${this.orgSeed}:dept:${department}`)
  }

  getEmployeeKey(department, employeeId) {
    return vrf.generateKeypairFromSeed(`${this.orgSeed}:dept:${department}:emp:${employeeId}`)
  }

  getProjectKey(projectId) {
    return vrf.generateKeypairFromSeed(`${this.orgSeed}:project:${projectId}`)
  }

  getResourceKey(resourceType, resourceId) {
    return vrf.generateKeypairFromSeed(`${this.orgSeed}:resource:${resourceType}:${resourceId}`)
  }

  signDepartmentDocument(department, document) {
    const deptKey = this.getDepartmentKey(department)
    const auxData = JSON.stringify({
      department,
      timestamp: Date.now(),
      type: 'department-document',
    })
    return vrf.vrfProve(deptKey.secretKey, document, auxData)
  }

  verifyDepartmentDocument(department, document, proof) {
    const deptKey = this.getDepartmentKey(department)
    const auxData = JSON.stringify({
      department,
      timestamp: Date.now(),
      type: 'department-document',
    })
    return vrf.vrfVerify(deptKey.publicKey, document, proof, auxData)
  }
}

const acmeCorp = new OrganizationKeys('acme-corp-2024-master-seed')

// Department keys
const engineering = acmeCorp.getDepartmentKey('engineering')
const marketing = acmeCorp.getDepartmentKey('marketing')
const finance = acmeCorp.getDepartmentKey('finance')

console.log('Engineering dept key:', engineering.publicKey.substring(0, 32) + '...')
console.log('Marketing dept key:', marketing.publicKey.substring(0, 32) + '...')
console.log('Finance dept key:', finance.publicKey.substring(0, 32) + '...')

// Employee keys
const engineer1 = acmeCorp.getEmployeeKey('engineering', 'emp001')
const marketer1 = acmeCorp.getEmployeeKey('marketing', 'emp002')

console.log('Engineer 1 key:', engineer1.publicKey.substring(0, 32) + '...')
console.log('Marketer 1 key:', marketer1.publicKey.substring(0, 32) + '...')

// Project keys
const projectAlpha = acmeCorp.getProjectKey('project-alpha')
const projectBeta = acmeCorp.getProjectKey('project-beta')

console.log('Project Alpha key:', projectAlpha.publicKey.substring(0, 32) + '...')
console.log('Project Beta key:', projectBeta.publicKey.substring(0, 32) + '...')

// Example 5: Multi-tenant key isolation
console.log('\n5. Multi-tenant key isolation:')
class TenantKeyManager {
  constructor(serviceSeed) {
    this.serviceSeed = serviceSeed
  }

  getTenantKey(tenantId) {
    return vrf.generateKeypairFromSeed(`${this.serviceSeed}:tenant:${tenantId}`)
  }

  getUserKey(tenantId, userId) {
    return vrf.generateKeypairFromSeed(`${this.serviceSeed}:tenant:${tenantId}:user:${userId}`)
  }

  getResourceKey(tenantId, resourceType, resourceId) {
    return vrf.generateKeypairFromSeed(`${this.serviceSeed}:tenant:${tenantId}:${resourceType}:${resourceId}`)
  }

  generateTenantBeacon(tenantId, round) {
    const tenantKey = this.getTenantKey(tenantId)
    const message = `tenant-beacon:${tenantId}:round:${round}`
    const auxData = JSON.stringify({
      tenantId,
      round,
      timestamp: Date.now(),
      service: 'multi-tenant-vrf',
    })

    const proof = vrf.vrfProve(tenantKey.secretKey, message, auxData)
    const randomness = vrf.vrfProofToHash(proof)

    return {
      tenantId,
      round,
      randomness,
      proof,
      auxData,
      publicKey: tenantKey.publicKey,
    }
  }
}

const multiTenantService = new TenantKeyManager('saas-platform-master-seed')

// Generate keys for different tenants
const tenant1 = multiTenantService.getTenantKey('tenant-001')
const tenant2 = multiTenantService.getTenantKey('tenant-002')

console.log('Tenant 1 key:', tenant1.publicKey.substring(0, 32) + '...')
console.log('Tenant 2 key:', tenant2.publicKey.substring(0, 32) + '...')

// Generate user keys within tenants
const tenant1User1 = multiTenantService.getUserKey('tenant-001', 'user-123')
const tenant2User1 = multiTenantService.getUserKey('tenant-002', 'user-123')

console.log('Tenant 1 User 123:', tenant1User1.publicKey.substring(0, 32) + '...')
console.log('Tenant 2 User 123:', tenant2User1.publicKey.substring(0, 32) + '...')
console.log('Same user ID, different tenants → different keys:', tenant1User1.publicKey !== tenant2User1.publicKey)

// Generate tenant-specific beacons
const tenant1Beacon = multiTenantService.generateTenantBeacon('tenant-001', 1)
const tenant2Beacon = multiTenantService.generateTenantBeacon('tenant-002', 1)

console.log('Tenant 1 beacon:', tenant1Beacon.randomness.substring(0, 32) + '...')
console.log('Tenant 2 beacon:', tenant2Beacon.randomness.substring(0, 32) + '...')

// Example 6: Security demonstration
console.log('\n6. Key isolation security:')

// Attempt to derive another tenant's keys without their seed
const attacker = new TenantKeyManager('attacker-seed')
const attackerTenant1 = attacker.getTenantKey('tenant-001')

console.log('Legitimate tenant 1 key:', tenant1.publicKey.substring(0, 32) + '...')
console.log("Attacker's attempt:", attackerTenant1.publicKey.substring(0, 32) + '...')
console.log('Attacker cannot derive correct key:', tenant1.publicKey !== attackerTenant1.publicKey)

// Demonstrate seed sensitivity
const similarSeed = new TenantKeyManager('saas-platform-master-seed-typo')
const similarTenant1 = similarSeed.getTenantKey('tenant-001')

console.log('Original key:', tenant1.publicKey.substring(0, 32) + '...')
console.log('Similar seed key:', similarTenant1.publicKey.substring(0, 32) + '...')
console.log('Small seed change → completely different key:', tenant1.publicKey !== similarTenant1.publicKey)

console.log('\n=== Summary ===\n')
console.log('• Deterministic key derivation enables predictable key management')
console.log('• Hierarchical paths provide logical key organization')
console.log('• Time-based rotation ensures forward secrecy')
console.log('• Organization structures map naturally to key hierarchies')
console.log('• Multi-tenant isolation prevents cross-tenant key access')
console.log('• Master seed security is critical for entire key hierarchy')
