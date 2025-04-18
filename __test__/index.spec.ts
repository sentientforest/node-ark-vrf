import test from 'ava'

import { generateKeypairFromSeed, vrfProve, vrfVerify, vrfProofToHash } from '../index'

let keypair: ReturnType<typeof generateKeypairFromSeed>
let proof: string
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
  proof = vrfProve(keypair.secretKey, testMessage, testAuxData)
  t.truthy(proof)
  t.is(typeof proof, 'string')
})

test('vrfVerify should validate proof', (t) => {
  const isValid = vrfVerify(keypair.publicKey, testMessage, proof, testAuxData)
  t.true(isValid)
})

test('vrfVerify should reject invalid message', (t) => {
  const isValid = vrfVerify(keypair.publicKey, 'wrong message', proof, testAuxData)
  t.false(isValid)
})

test('vrfVerify should reject invalid aux data', (t) => {
  const isValid = vrfVerify(keypair.publicKey, testMessage, proof, 'wrong aux data')
  t.false(isValid)
})

test('vrfProofToHash should convert proof to hash', (t) => {
  const hash = vrfProofToHash(proof)
  t.truthy(hash)
  t.is(typeof hash, 'string')
  t.true(hash.length > 0)
})
