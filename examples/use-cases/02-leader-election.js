#!/usr/bin/env node

/**
 * Consensus Leader Election Implementation
 *
 * This example demonstrates how to implement fair, verifiable leader
 * election using VRF for consensus protocols. VRF ensures that:
 * - Leaders cannot be predicted in advance
 * - Election is verifiable by all participants
 * - No single party can manipulate the outcome
 *
 * Use cases:
 * - Blockchain consensus protocols (Algorand-style)
 * - Distributed system coordination
 * - Fair committee selection
 * - Round-robin with provable randomness
 *
 * Run with: node 02-leader-election.js
 */

const vrf = require('../../index')
const crypto = require('crypto')

console.log('=== Consensus Leader Election Example ===\n')

/**
 * Consensus Node with VRF-based leader election
 */
class ConsensusNode {
  constructor(nodeId, seed, stake = 100) {
    this.nodeId = nodeId
    this.keypair = vrf.generateKeypairFromSeed(seed)
    this.stake = stake
    this.proposalHistory = new Map()
  }

  /**
   * Propose leadership for a specific slot/round
   */
  proposeForSlot(slot, difficulty = 0.1) {
    const input = `slot:${slot}:node:${this.nodeId}`
    const auxData = JSON.stringify({
      nodeId: this.nodeId,
      slot,
      stake: this.stake,
      timestamp: Date.now(),
    })

    const proof = vrf.vrfProve(this.keypair.secretKey, input, auxData)
    const hash = vrf.vrfProofToHash(proof)

    // Convert hash to number for threshold comparison
    const hashValue = BigInt('0x' + hash.substring(0, 16))
    const maxValue = BigInt('0xffffffffffffffff')
    const normalized = Number(hashValue) / Number(maxValue)

    // Stake-weighted threshold - higher stake = higher chance
    const stakeWeight = this.stake / 1000 // Assume max 1000 total stake
    const threshold = difficulty * stakeWeight
    const isEligible = normalized < threshold

    const proposal = {
      nodeId: this.nodeId,
      slot,
      input,
      proof,
      hash,
      normalized,
      threshold,
      isEligible,
      stake: this.stake,
      publicKey: this.keypair.publicKey,
      auxData,
      timestamp: Date.now(),
    }

    this.proposalHistory.set(slot, proposal)
    return proposal
  }

  /**
   * Verify another node's proposal
   */
  verifyProposal(proposal) {
    try {
      const expectedInput = `slot:${proposal.slot}:node:${proposal.nodeId}`

      // Verify the VRF proof
      const proofValid = vrf.vrfVerify(proposal.publicKey, expectedInput, proposal.proof, proposal.auxData)

      if (!proofValid) return false

      // Verify hash derivation
      const expectedHash = vrf.vrfProofToHash(proposal.proof)
      if (expectedHash !== proposal.hash) return false

      // Verify threshold calculation
      const hashValue = BigInt('0x' + proposal.hash.substring(0, 16))
      const maxValue = BigInt('0xffffffffffffffff')
      const normalized = Number(hashValue) / Number(maxValue)

      return Math.abs(normalized - proposal.normalized) < 0.0001 // Small tolerance
    } catch (error) {
      console.error(`Verification error for ${proposal.nodeId}:`, error.message)
      return false
    }
  }

  /**
   * Get proposal for a specific slot
   */
  getProposal(slot) {
    return this.proposalHistory.get(slot)
  }
}

/**
 * Consensus Network Manager
 */
class ConsensusNetwork {
  constructor() {
    this.nodes = new Map()
    this.slots = new Map()
    this.currentSlot = 0
  }

  addNode(nodeId, seed, stake) {
    const node = new ConsensusNode(nodeId, seed, stake)
    this.nodes.set(nodeId, node)
    console.log(`Added node ${nodeId} with stake ${stake} and public key ${node.keypair.publicKey.substring(0, 16)}...`)
    return node
  }

  /**
   * Run leader election for a slot
   */
  electLeader(slot, difficulty = 0.3) {
    console.log(`\n--- Leader Election for Slot ${slot} ---`)
    const proposals = []

    // Each node creates a proposal
    for (const [nodeId, node] of this.nodes) {
      const proposal = node.proposeForSlot(slot, difficulty)
      proposals.push(proposal)

      console.log(
        `${nodeId}: ${proposal.isEligible ? '✓ Eligible' : '✗ Not eligible'} (${proposal.normalized.toFixed(6)} < ${proposal.threshold.toFixed(6)})`,
      )
    }

    // Filter eligible proposals
    const eligibleProposals = proposals.filter((p) => p.isEligible)

    if (eligibleProposals.length === 0) {
      console.log('No eligible leaders for this slot')
      return null
    }

    // Select leader with lowest VRF output (most "lucky")
    const leader = eligibleProposals.reduce((best, current) => (current.hash < best.hash ? current : best))

    console.log(`Leader selected: ${leader.nodeId} with hash ${leader.hash.substring(0, 16)}...`)

    // Verify all proposals
    const allValid = proposals.every((proposal) => {
      const proposer = this.nodes.get(proposal.nodeId)
      return proposer.verifyProposal(proposal)
    })

    const result = {
      slot,
      leader: leader.nodeId,
      leaderProposal: leader,
      allProposals: proposals,
      eligibleCount: eligibleProposals.length,
      totalNodes: this.nodes.size,
      allValid,
      timestamp: Date.now(),
    }

    this.slots.set(slot, result)
    return result
  }

  /**
   * Verify a slot result
   */
  verifySlotResult(slotResult) {
    for (const proposal of slotResult.allProposals) {
      const node = this.nodes.get(proposal.nodeId)
      if (!node.verifyProposal(proposal)) {
        return false
      }
    }
    return true
  }

  /**
   * Get network statistics
   */
  getNetworkStats() {
    const totalStake = Array.from(this.nodes.values()).reduce((sum, node) => sum + node.stake, 0)
    const nodeStats = Array.from(this.nodes.values()).map((node) => ({
      nodeId: node.nodeId,
      stake: node.stake,
      stakePercentage: ((node.stake / totalStake) * 100).toFixed(1),
    }))

    return { totalStake, nodeStats }
  }
}

// Example 1: Basic leader election
console.log('1. Basic Leader Election:')
const network = new ConsensusNetwork()

// Add nodes with different stakes
network.addNode('alice', 'alice-secret-seed', 300)
network.addNode('bob', 'bob-secret-seed', 200)
network.addNode('charlie', 'charlie-secret-seed', 150)
network.addNode('diana', 'diana-secret-seed', 250)
network.addNode('eve', 'eve-secret-seed', 100)

const stats = network.getNetworkStats()
console.log('\nNetwork composition:')
stats.nodeStats.forEach((node) => {
  console.log(`  ${node.nodeId}: ${node.stake} stake (${node.stakePercentage}%)`)
})

// Run several rounds of leader election
const results = []
for (let slot = 1; slot <= 5; slot++) {
  const result = network.electLeader(slot, 0.4) // 40% base difficulty
  if (result) {
    results.push(result)
    console.log(`Slot ${slot} verification: ${result.allValid ? 'All valid ✓' : 'Invalid ✗'}`)
  }
}

// Example 2: Committee selection
console.log('\n2. Committee Selection:')
class CommitteeSelector {
  constructor(nodes, committeeSize = 3) {
    this.nodes = nodes
    this.committeeSize = committeeSize
  }

  selectCommittee(round, seed = null) {
    const baseInput = seed || `committee-selection-round-${round}`
    const candidates = []

    // Each node computes their committee score
    for (const [nodeId, node] of this.nodes) {
      const input = `${baseInput}:node:${nodeId}`
      const auxData = JSON.stringify({
        nodeId,
        round,
        stake: node.stake,
        purpose: 'committee-selection',
      })

      const proof = vrf.vrfProve(node.keypair.secretKey, input, auxData)
      const hash = vrf.vrfProofToHash(proof)

      // Weight by stake
      const hashValue = BigInt('0x' + hash.substring(0, 16))
      const stakeWeight = BigInt(node.stake)
      const weightedScore = hashValue * stakeWeight

      candidates.push({
        nodeId,
        proof,
        hash,
        stake: node.stake,
        weightedScore,
        publicKey: node.keypair.publicKey,
        auxData,
      })
    }

    // Select top candidates by weighted score
    candidates.sort((a, b) => (a.weightedScore > b.weightedScore ? -1 : 1))
    const committee = candidates.slice(0, this.committeeSize)

    return {
      round,
      committee: committee.map((c) => c.nodeId),
      candidates,
      size: committee.length,
    }
  }

  verifyCommittee(selection) {
    // Verify each candidate's VRF proof
    for (const candidate of selection.candidates) {
      const node = this.nodes.get(candidate.nodeId)
      const baseInput = `committee-selection-round-${selection.round}`
      const input = `${baseInput}:node:${candidate.nodeId}`

      const valid = vrf.vrfVerify(candidate.publicKey, input, candidate.proof, candidate.auxData)

      if (!valid) return false

      // Verify hash
      const expectedHash = vrf.vrfProofToHash(candidate.proof)
      if (expectedHash !== candidate.hash) return false
    }

    return true
  }
}

const committeeSelector = new CommitteeSelector(network.nodes, 3)

for (let round = 1; round <= 3; round++) {
  const committee = committeeSelector.selectCommittee(round)
  const isValid = committeeSelector.verifyCommittee(committee)

  console.log(`Round ${round} committee: [${committee.committee.join(', ')}]`)
  console.log(`Verification: ${isValid ? 'Valid ✓' : 'Invalid ✗'}`)
}

// Example 3: Slashing-resistant leader election
console.log('\n3. Slashing-Resistant Election:')
class SlashingResistantElection {
  constructor(nodes) {
    this.nodes = nodes
    this.slashedNodes = new Set()
    this.penalties = new Map()
  }

  slashNode(nodeId, reason) {
    this.slashedNodes.add(nodeId)
    this.penalties.set(nodeId, { reason, timestamp: Date.now() })
    console.log(`⚠️  Node ${nodeId} slashed for: ${reason}`)
  }

  getEffectiveStake(nodeId) {
    const node = this.nodes.get(nodeId)
    if (!node) return 0

    if (this.slashedNodes.has(nodeId)) {
      return Math.floor(node.stake * 0.1) // 90% penalty
    }

    return node.stake
  }

  electLeaderWithSlashing(slot, difficulty = 0.3) {
    console.log(`\nSlashing-resistant election for slot ${slot}:`)
    const proposals = []

    for (const [nodeId, node] of this.nodes) {
      const effectiveStake = this.getEffectiveStake(nodeId)
      const input = `slot:${slot}:node:${nodeId}`
      const auxData = JSON.stringify({
        nodeId,
        slot,
        originalStake: node.stake,
        effectiveStake,
        slashed: this.slashedNodes.has(nodeId),
      })

      const proof = vrf.vrfProve(node.keypair.secretKey, input, auxData)
      const hash = vrf.vrfProofToHash(proof)

      const hashValue = BigInt('0x' + hash.substring(0, 16))
      const maxValue = BigInt('0xffffffffffffffff')
      const normalized = Number(hashValue) / Number(maxValue)

      const stakeWeight = effectiveStake / 1000
      const threshold = difficulty * stakeWeight
      const isEligible = normalized < threshold

      proposals.push({
        nodeId,
        proof,
        hash,
        normalized,
        threshold,
        isEligible,
        originalStake: node.stake,
        effectiveStake,
        slashed: this.slashedNodes.has(nodeId),
        publicKey: node.keypair.publicKey,
        auxData,
      })

      const status = this.slashedNodes.has(nodeId) ? '⚠️  Slashed' : '✓ Normal'
      console.log(
        `  ${nodeId}: ${status} (${effectiveStake}/${node.stake} stake, ${isEligible ? 'eligible' : 'not eligible'})`,
      )
    }

    const eligibleProposals = proposals.filter((p) => p.isEligible)
    if (eligibleProposals.length === 0) return null

    const leader = eligibleProposals.reduce((best, current) => (current.hash < best.hash ? current : best))

    console.log(`Leader: ${leader.nodeId} ${leader.slashed ? '(slashed node won!)' : ''}`)
    return { slot, leader: leader.nodeId, proposals }
  }
}

const slashingElection = new SlashingResistantElection(network.nodes)

// Run normal election
slashingElection.electLeaderWithSlashing(101)

// Slash a node and run again
slashingElection.slashNode('alice', 'double signing')
slashingElection.electLeaderWithSlashing(102)

// Example 4: Finality and safety
console.log('\n4. Finality Tracking:')
class FinalityTracker {
  constructor(network) {
    this.network = network
    this.chain = []
    this.finalizedSlots = new Set()
  }

  addBlock(slot, leader, parentHash = null) {
    const leaderNode = this.network.nodes.get(leader)
    const blockData = {
      slot,
      leader,
      parentHash,
      timestamp: Date.now(),
    }

    const input = JSON.stringify(blockData)
    const auxData = JSON.stringify({
      slot,
      leader,
      blockHeight: this.chain.length,
      purpose: 'block-production',
    })

    const proof = vrf.vrfProve(leaderNode.keypair.secretKey, input, auxData)
    const blockHash = vrf.vrfProofToHash(proof)

    const block = {
      ...blockData,
      blockHash,
      proof,
      auxData,
      publicKey: leaderNode.keypair.publicKey,
      height: this.chain.length,
    }

    this.chain.push(block)

    // Simple finality rule: 2 confirmations
    if (this.chain.length >= 3) {
      const finalizeSlot = this.chain[this.chain.length - 3].slot
      this.finalizedSlots.add(finalizeSlot)
    }

    return block
  }

  verifyChain() {
    for (const block of this.chain) {
      const node = this.network.nodes.get(block.leader)
      const input = JSON.stringify({
        slot: block.slot,
        leader: block.leader,
        parentHash: block.parentHash,
        timestamp: block.timestamp,
      })

      const valid = vrf.vrfVerify(block.publicKey, input, block.proof, block.auxData)

      if (!valid) return false

      const expectedHash = vrf.vrfProofToHash(block.proof)
      if (expectedHash !== block.blockHash) return false
    }

    return true
  }

  getFinalityStatus() {
    return {
      totalBlocks: this.chain.length,
      finalizedBlocks: this.finalizedSlots.size,
      pendingBlocks: this.chain.length - this.finalizedSlots.size,
      chainValid: this.verifyChain(),
    }
  }
}

const finalityTracker = new FinalityTracker(network)

// Build a chain
for (let slot = 201; slot <= 205; slot++) {
  const election = network.electLeader(slot, 0.5)
  if (election && election.leader) {
    const parentHash =
      finalityTracker.chain.length > 0 ? finalityTracker.chain[finalityTracker.chain.length - 1].blockHash : null

    const block = finalityTracker.addBlock(slot, election.leader, parentHash)
    console.log(
      `Block ${block.height}: Slot ${slot}, Leader ${block.leader}, Hash ${block.blockHash.substring(0, 16)}...`,
    )
  }
}

const finalityStatus = finalityTracker.getFinalityStatus()
console.log('\nFinality Status:', finalityStatus)

console.log('\n=== Summary ===\n')
console.log('• VRF enables fair, unpredictable leader election')
console.log('• Stake-weighting ensures proportional representation')
console.log('• All proposals are publicly verifiable')
console.log("• Slashing mechanisms can reduce malicious nodes' influence")
console.log('• Suitable for blockchain consensus and distributed coordination')
