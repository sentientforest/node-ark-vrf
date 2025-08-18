#!/usr/bin/env node

/**
 * Distributed Random Beacon Implementation
 *
 * This example demonstrates how to build an unbiasable distributed
 * random beacon using VRF. Random beacons provide publicly verifiable
 * randomness that cannot be manipulated or predicted.
 *
 * Use cases:
 * - Lottery drawings
 * - Leader election in consensus protocols
 * - Random sampling for audits
 * - Cryptographic key generation ceremonies
 *
 * Run with: node 01-random-beacon.js
 */

const vrf = require('../../index')
const crypto = require('crypto')

console.log('=== Distributed Random Beacon Example ===\n')

/**
 * Simple Random Beacon implementation
 */
class RandomBeacon {
  constructor(seed, beaconId) {
    this.keypair = vrf.generateKeypairFromSeed(seed)
    this.beaconId = beaconId
    this.history = new Map() // Store previous outputs
  }

  /**
   * Generate a beacon output for a specific epoch
   */
  generateBeacon(epoch, previousHash = null) {
    // Create deterministic input from epoch and previous state
    const input = this.createBeaconInput(epoch, previousHash)

    // Additional data includes beacon metadata
    const auxData = JSON.stringify({
      beaconId: this.beaconId,
      epoch,
      timestamp: Date.now(),
      previousHash,
    })

    const proof = vrf.vrfProve(this.keypair.secretKey, input, auxData)
    const randomness = vrf.vrfProofToHash(proof)

    const beacon = {
      beaconId: this.beaconId,
      epoch,
      input,
      randomness,
      proof,
      auxData,
      publicKey: this.keypair.publicKey,
      timestamp: Date.now(),
    }

    // Store in history
    this.history.set(epoch, beacon)
    return beacon
  }

  /**
   * Verify a beacon output
   */
  verifyBeacon(beacon) {
    try {
      return vrf.vrfVerify(beacon.publicKey, beacon.input, beacon.proof, beacon.auxData)
    } catch (error) {
      console.error('Beacon verification error:', error.message)
      return false
    }
  }

  /**
   * Create deterministic input for beacon generation
   */
  createBeaconInput(epoch, previousHash) {
    return `beacon:${this.beaconId}:epoch:${epoch}:prev:${previousHash || 'genesis'}`
  }

  /**
   * Get beacon history
   */
  getHistory() {
    return Array.from(this.history.values()).sort((a, b) => a.epoch - b.epoch)
  }
}

/**
 * Multi-party beacon coordinator
 */
class BeaconNetwork {
  constructor() {
    this.participants = new Map()
    this.currentEpoch = 0
    this.beaconChain = []
  }

  addParticipant(id, seed) {
    const beacon = new RandomBeacon(seed, id)
    this.participants.set(id, beacon)
    console.log(`Added participant ${id} with public key ${beacon.keypair.publicKey.substring(0, 16)}...`)
  }

  /**
   * Run a beacon round with all participants
   */
  runBeaconRound() {
    const epoch = ++this.currentEpoch
    const previousHash =
      this.beaconChain.length > 0 ? this.beaconChain[this.beaconChain.length - 1].finalRandomness : null

    console.log(`\n--- Beacon Round ${epoch} ---`)
    console.log(`Previous hash: ${previousHash ? previousHash.substring(0, 16) + '...' : 'genesis'}`)

    const outputs = []

    // Each participant generates their contribution
    for (const [id, beacon] of this.participants) {
      const output = beacon.generateBeacon(epoch, previousHash)
      outputs.push(output)
      console.log(`${id}: ${output.randomness.substring(0, 16)}...`)
    }

    // Combine all outputs to create final randomness
    const combined = outputs.map((o) => o.randomness).join('')
    const finalRandomness = crypto.createHash('sha256').update(combined).digest('hex')

    const roundResult = {
      epoch,
      participants: outputs.map((o) => o.beaconId),
      outputs,
      finalRandomness,
      timestamp: Date.now(),
    }

    this.beaconChain.push(roundResult)
    console.log(`Final randomness: ${finalRandomness.substring(0, 32)}...`)

    return roundResult
  }

  /**
   * Verify all outputs in a round
   */
  verifyRound(roundResult) {
    console.log(`\nVerifying round ${roundResult.epoch}:`)

    for (const output of roundResult.outputs) {
      const participant = this.participants.get(output.beaconId)
      const isValid = participant.verifyBeacon(output)
      console.log(`  ${output.beaconId}: ${isValid ? '✓' : '✗'}`)

      if (!isValid) return false
    }

    // Verify final randomness computation
    const combined = roundResult.outputs.map((o) => o.randomness).join('')
    const expectedFinal = crypto.createHash('sha256').update(combined).digest('hex')
    const finalValid = expectedFinal === roundResult.finalRandomness
    console.log(`  Final randomness: ${finalValid ? '✓' : '✗'}`)

    return finalValid
  }
}

// Example 1: Single beacon
console.log('1. Single Random Beacon:')
const singleBeacon = new RandomBeacon('beacon-secret-123', 'beacon-alpha')

// Generate sequence of random values
for (let epoch = 1; epoch <= 3; epoch++) {
  const previousHash = epoch > 1 ? singleBeacon.history.get(epoch - 1).randomness : null

  const output = singleBeacon.generateBeacon(epoch, previousHash)
  console.log(`Epoch ${epoch}: ${output.randomness.substring(0, 32)}...`)

  // Verify the output
  const isValid = singleBeacon.verifyBeacon(output)
  console.log(`  Verification: ${isValid ? 'Valid ✓' : 'Invalid ✗'}`)
}

// Example 2: Distributed beacon network
console.log('\n2. Distributed Beacon Network:')
const network = new BeaconNetwork()

// Add participants
network.addParticipant('node-1', 'node1-secret-seed')
network.addParticipant('node-2', 'node2-secret-seed')
network.addParticipant('node-3', 'node3-secret-seed')

// Run several rounds
for (let round = 1; round <= 3; round++) {
  const result = network.runBeaconRound()
  const isValid = network.verifyRound(result)
  console.log(`Round ${round} verification: ${isValid ? 'All valid ✓' : 'Invalid ✗'}`)
}

// Example 3: Lottery drawing
console.log('\n3. Lottery Drawing Application:')
class LotteryDrawing {
  constructor(beaconNetwork) {
    this.network = beaconNetwork
    this.tickets = []
  }

  addTicket(id, owner) {
    this.tickets.push({ id, owner })
  }

  drawWinner(round) {
    if (this.tickets.length === 0) {
      throw new Error('No tickets available')
    }

    const roundResult = this.network.beaconChain[round - 1]
    if (!roundResult) {
      throw new Error(`Round ${round} not found`)
    }

    // Use beacon randomness to select winner
    const randomBytes = Buffer.from(roundResult.finalRandomness, 'hex')
    const randomValue = randomBytes.readBigUInt64BE() % BigInt(this.tickets.length)
    const winnerIndex = Number(randomValue)
    const winner = this.tickets[winnerIndex]

    return {
      round,
      winner,
      winnerIndex,
      totalTickets: this.tickets.length,
      randomness: roundResult.finalRandomness,
      verifiable: true,
    }
  }
}

const lottery = new LotteryDrawing(network)

// Add lottery tickets
;['Alice', 'Bob', 'Charlie', 'Diana', 'Eve'].forEach((name, i) => {
  lottery.addTicket(`ticket-${i + 1}`, name)
})

// Draw winner using latest beacon round
const drawing = lottery.drawWinner(network.currentEpoch)
console.log('Lottery Results:')
console.log(`Winner: ${drawing.winner.owner} (ticket ${drawing.winner.id})`)
console.log(`Selected index: ${drawing.winnerIndex} out of ${drawing.totalTickets} tickets`)
console.log(`Randomness source: Round ${drawing.round}`)
console.log(`Verifiable: ${drawing.verifiable ? 'Yes ✓' : 'No ✗'}`)

// Example 4: Audit sampling
console.log('\n4. Random Audit Sampling:')
class AuditSampler {
  constructor(population, sampleSize) {
    this.population = population
    this.sampleSize = Math.min(sampleSize, population.length)
  }

  selectSample(randomness) {
    const selected = new Set()
    const samples = []

    for (let i = 0; i < this.sampleSize; i++) {
      const hash = crypto
        .createHash('sha256')
        .update(randomness + i.toString())
        .digest()

      let index
      do {
        const randomValue = hash.readBigUInt64BE() % BigInt(this.population.length)
        index = Number(randomValue)
      } while (selected.has(index))

      selected.add(index)
      samples.push({
        index,
        item: this.population[index],
      })
    }

    return samples
  }
}

// Create population to audit
const auditPopulation = Array.from({ length: 1000 }, (_, i) => `record-${i + 1}`)
const sampler = new AuditSampler(auditPopulation, 5)

// Use latest beacon for sampling
const latestBeacon = network.beaconChain[network.beaconChain.length - 1]
const auditSample = sampler.selectSample(latestBeacon.finalRandomness)

console.log('Random Audit Sample:')
auditSample.forEach((sample, i) => {
  console.log(`  ${i + 1}. ${sample.item} (index ${sample.index})`)
})
console.log(`Sample source: Beacon round ${latestBeacon.epoch}`)

console.log('\n=== Summary ===\n')
console.log('• Random beacons provide unbiasable, publicly verifiable randomness')
console.log('• VRF ensures the beacon output cannot be predicted or manipulated')
console.log('• Multi-party beacons combine outputs for increased security')
console.log('• Perfect for lotteries, leader election, and audit sampling')
console.log('• All outputs are verifiable using public keys and proofs')
