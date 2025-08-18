#!/usr/bin/env node

/**
 * VRF with Auxiliary Data (VRF-AD) Example
 *
 * This example demonstrates:
 * - Binding additional context data to VRF proofs
 * - Use cases for auxiliary data in VRF applications
 * - Security implications of auxiliary data binding
 *
 * VRF-AD allows binding arbitrary auxiliary data to proofs without
 * affecting the VRF output, providing additional security guarantees.
 *
 * Run with: node 01-auxiliary-data.js
 */

const vrf = require('../../index')
const crypto = require('crypto')

console.log('=== VRF with Auxiliary Data Example ===\n')

// Setup
const keypair = vrf.generateKeypairFromSeed('auxdata-example-seed')
console.log('Generated keypair for auxiliary data examples\n')

// Example 1: Basic auxiliary data usage
console.log('1. Basic auxiliary data binding:')
const message = 'transaction-12345'
const auxData = 'timestamp:1699123456,user:alice'

const proofWithAux = vrf.vrfProve(keypair.secretKey, message, auxData)
const proofWithoutAux = vrf.vrfProve(keypair.secretKey, message)

console.log('Message:', message)
console.log('Auxiliary data:', auxData)
console.log('Proof with aux data:', proofWithAux.substring(0, 64) + '...')
console.log('Proof without aux data:', proofWithoutAux.substring(0, 64) + '...')
console.log('Proofs differ:', proofWithAux !== proofWithoutAux)

// Verify both cases
const validWithAux = vrf.vrfVerify(keypair.publicKey, message, proofWithAux, auxData)
const invalidWithoutAux = vrf.vrfVerify(keypair.publicKey, message, proofWithAux)
console.log('Verification with aux data:', validWithAux)
console.log('Verification without aux data:', invalidWithoutAux)

// Example 2: Hash output is unaffected by auxiliary data
console.log('\n2. Hash output independence:')
const hash1 = vrf.vrfProofToHash(proofWithAux)
const hash2 = vrf.vrfProofToHash(proofWithoutAux)

console.log('Hash with aux data:', hash1.substring(0, 32) + '...')
console.log('Hash without aux data:', hash2.substring(0, 32) + '...')
console.log('Hashes are identical:', hash1 === hash2)
console.log('✓ Auxiliary data does not affect VRF output')

// Example 3: Timestamped transactions
console.log('\n3. Timestamped transaction example:')
const transactionId = 'tx-789abc'
const timestamp = Date.now()
const nonce = crypto.randomBytes(8).toString('hex')
const context = JSON.stringify({ timestamp, nonce, network: 'mainnet' })

const txProof = vrf.vrfProve(keypair.secretKey, transactionId, context)
const txValid = vrf.vrfVerify(keypair.publicKey, transactionId, txProof, context)

console.log('Transaction ID:', transactionId)
console.log('Context:', context)
console.log('Proof valid:', txValid)

// Wrong context fails verification
const wrongContext = JSON.stringify({ timestamp: timestamp + 1000, nonce, network: 'mainnet' })
const wrongContextValid = vrf.vrfVerify(keypair.publicKey, transactionId, txProof, wrongContext)
console.log('Wrong context valid:', wrongContextValid)

// Example 4: Multi-party protocol
console.log('\n4. Multi-party protocol with session data:')
const sessionId = 'session-xyz789'
const participants = ['alice', 'bob', 'charlie']
const round = 5
const sessionData = JSON.stringify({ sessionId, participants, round })

const protocolProof = vrf.vrfProve(keypair.secretKey, 'leader-selection', sessionData)
const protocolHash = vrf.vrfProofToHash(protocolProof)

console.log('Protocol message: leader-selection')
console.log('Session data:', sessionData)
console.log('Leader hash:', protocolHash.substring(0, 16) + '...')

// Verify with exact session data
const sessionValid = vrf.vrfVerify(keypair.publicKey, 'leader-selection', protocolProof, sessionData)
console.log('Session verification:', sessionValid)

// Different round number fails
const wrongRound = JSON.stringify({ sessionId, participants, round: round + 1 })
const wrongRoundValid = vrf.vrfVerify(keypair.publicKey, 'leader-selection', protocolProof, wrongRound)
console.log('Wrong round verification:', wrongRoundValid)

// Example 5: DNS query privacy (NSEC5-like)
console.log('\n5. DNS query privacy example:')
const domainQuery = 'example.com'
const queryMetadata = JSON.stringify({
  queryType: 'A',
  recursionDesired: true,
  clientSubnet: '192.0.2.0/24',
  timestamp: Date.now(),
})

const dnsProof = vrf.vrfProve(keypair.secretKey, domainQuery, queryMetadata)
const dnsHash = vrf.vrfProofToHash(dnsProof)

console.log('Domain query:', domainQuery)
console.log('Query metadata:', queryMetadata)
console.log('Privacy-preserving hash:', dnsHash.substring(0, 32) + '...')

// Client can verify the response
const dnsValid = vrf.vrfVerify(keypair.publicKey, domainQuery, dnsProof, queryMetadata)
console.log('DNS response verification:', dnsValid)

// Example 6: Lottery with ticket verification
console.log('\n6. Lottery with ticket verification:')
const ticketNumber = '12345'
const lotteryRound = 'round-2024-001'
const ticketData = JSON.stringify({
  round: lotteryRound,
  purchaseTime: Date.now(),
  price: '10.00',
  currency: 'USD',
})

const lotteryProof = vrf.vrfProve(keypair.secretKey, ticketNumber, ticketData)
const winningHash = vrf.vrfProofToHash(lotteryProof)

// Check if this is a winning ticket (first 4 hex chars = 0000)
const isWinner = winningHash.startsWith('0000')
console.log('Ticket number:', ticketNumber)
console.log('Lottery round:', lotteryRound)
console.log('Winning hash:', winningHash.substring(0, 32) + '...')
console.log('Is winner:', isWinner ? '🎉 YES!' : 'No')

// Example 7: Empty auxiliary data
console.log('\n7. Empty auxiliary data:')
const emptyAuxProof = vrf.vrfProve(keypair.secretKey, 'test-message', '')
const nullAuxProof = vrf.vrfProve(keypair.secretKey, 'test-message', null)
const noAuxProof = vrf.vrfProve(keypair.secretKey, 'test-message')

console.log('Empty string aux:', emptyAuxProof.substring(0, 32) + '...')
console.log('Null aux:', nullAuxProof.substring(0, 32) + '...')
console.log('No aux:', noAuxProof.substring(0, 32) + '...')
console.log('Empty and null equivalent:', emptyAuxProof === nullAuxProof)
console.log('Null and no-aux equivalent:', nullAuxProof === noAuxProof)

// Example 8: Large auxiliary data
console.log('\n8. Large auxiliary data handling:')
const largeAuxData = JSON.stringify({
  metadata: crypto.randomBytes(500).toString('hex'),
  signatures: Array(10)
    .fill(0)
    .map(() => crypto.randomBytes(64).toString('hex')),
  extraData: 'Large auxiliary data can be used without performance issues',
})

const largeAuxProof = vrf.vrfProve(keypair.secretKey, 'large-aux-test', largeAuxData)
const largeAuxValid = vrf.vrfVerify(keypair.publicKey, 'large-aux-test', largeAuxProof, largeAuxData)

console.log('Auxiliary data size:', largeAuxData.length, 'bytes')
console.log('Large aux data proof valid:', largeAuxValid)
console.log('✓ Large auxiliary data handled efficiently')

// Example 9: Security demonstration
console.log('\n9. Security properties:')
const secureMessage = 'sensitive-operation'
const secureContext = 'authorization:admin,ip:192.168.1.1,time:' + Date.now()

const secureProof = vrf.vrfProve(keypair.secretKey, secureMessage, secureContext)

// Attacker tries to replay with different context
const attackContext = 'authorization:admin,ip:10.0.0.1,time:' + Date.now()
const replayAttack = vrf.vrfVerify(keypair.publicKey, secureMessage, secureProof, attackContext)

console.log('Original context:', secureContext)
console.log('Attack context:', attackContext)
console.log('Replay attack succeeds:', replayAttack)
console.log('✓ Auxiliary data prevents context manipulation')

console.log('\n=== Summary ===\n')
console.log('• Auxiliary data binds additional context to VRF proofs')
console.log('• The VRF output hash is unaffected by auxiliary data')
console.log('• Verification requires the exact same auxiliary data')
console.log('• Useful for timestamping, session binding, and context validation')
console.log('• Provides replay attack protection and context integrity')
console.log('• Can handle large auxiliary data efficiently')
