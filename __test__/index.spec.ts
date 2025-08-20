import test from 'ava'

import { generateKeypairFromSeed, vrfProve, vrfVerify, vrfProofToHash } from '../index'

let keypair: ReturnType<typeof generateKeypairFromSeed>
let proofOutput: ReturnType<typeof vrfProve>
const testSeed = 'test seed'
const testMessage = 'test message'
const testAuxData = 'test aux data'

test('generateKeypairFromSeed should create valid keypair', (t) => {
  keypair = generateKeypairFromSeed(testSeed)
  t.truthy(keypair.publicKey)
  t.truthy(keypair.secretKey)
  t.is(typeof keypair.publicKey, 'string')
  t.is(typeof keypair.secretKey, 'string')
})

test('vrfProve should generate proof', (t) => {
  proofOutput = vrfProve(keypair.secretKey, testMessage, testAuxData)
  t.truthy(proofOutput.proof)
  t.truthy(proofOutput.output)
  t.is(typeof proofOutput.proof, 'string')
  t.is(typeof proofOutput.output, 'string')
})

test('vrfVerify should validate proof', (t) => {
  const isValid = vrfVerify(keypair.publicKey, testMessage, proofOutput.proof, proofOutput.output, testAuxData)
  t.true(isValid)
})

test('vrfVerify should reject invalid message', (t) => {
  const isValid = vrfVerify(keypair.publicKey, 'wrong message', proofOutput.proof, proofOutput.output, testAuxData)
  t.false(isValid)
})

test('vrfVerify should reject invalid aux data', (t) => {
  const isValid = vrfVerify(keypair.publicKey, testMessage, proofOutput.proof, proofOutput.output, 'wrong aux data')
  t.false(isValid)
})

test('vrfProofToHash should convert proof to hash', (t) => {
  const hash = vrfProofToHash(proofOutput.proof)
  t.truthy(hash)
  t.is(typeof hash, 'string')
  t.true(hash.length > 0)
})
