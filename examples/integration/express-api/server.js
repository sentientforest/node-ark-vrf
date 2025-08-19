#!/usr/bin/env node

/**
 * Express.js VRF API Server
 *
 * This example demonstrates how to integrate VRF functionality
 * into a RESTful API using Express.js.
 *
 * Features:
 * - VRF signing and verification endpoints
 * - Random beacon generation
 * - Batch operations
 * - Authentication with VRF signatures
 * - WebSocket real-time updates
 *
 * Install dependencies:
 * npm install express cors helmet ratelimit ws uuid
 *
 * Run with: node server.js
 * Then visit: http://localhost:3000
 */

const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
const WebSocket = require('ws')
const { createServer } = require('http')
const { v4: uuidv4 } = require('uuid')
const path = require('path')

// Import VRF utilities
const {
  VrfSigner,
  VrfVerifier,
  BatchProcessor,
  BeaconGenerator,
  VrfValidator,
  VrfFormatter,
  SafeVrfOperations,
  VrfUtils,
} = require('../../utils/vrf-helpers')

const app = express()
const server = createServer(app)
const wss = new WebSocket.Server({ server })

// Configuration
const config = {
  port: process.env.PORT || 3000,
  vrfSeed: process.env.VRF_SEED || 'express-vrf-api-demo-seed',
  beaconInterval: 30000, // 30 seconds
  maxBatchSize: 100,
}

// Initialize VRF components
const apiSigner = new VrfSigner(config.vrfSeed)
const batchProcessor = new BatchProcessor(apiSigner)
const beacon = new BeaconGenerator(config.vrfSeed, 'express-api-beacon')

// In-memory storage (use database in production)
const storage = {
  signatures: new Map(),
  beacons: [],
  sessions: new Map(),
}

// Middleware setup
app.use(helmet())
app.use(cors())
app.use(express.json({ limit: '10mb' }))

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP',
})
app.use('/api/', limiter)

// Batch operation limits
const batchLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // 10 batch operations per 5 minutes
  message: 'Too many batch requests',
})

// Static files
app.use(express.static(path.join(__dirname, 'public')))

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`)
  next()
})

// VRF Authentication middleware
function vrfAuth(req, res, next) {
  const signature = req.headers['x-vrf-signature']
  const message = req.headers['x-vrf-message'] || req.path
  const publicKey = req.headers['x-vrf-public-key']

  if (!signature || !publicKey) {
    return res.status(401).json({
      error: 'VRF authentication required',
      required: ['x-vrf-signature', 'x-vrf-public-key'],
    })
  }

  try {
    const signatureData = JSON.parse(Buffer.from(signature, 'base64').toString())
    const isValid = VrfVerifier.verify(signatureData)

    if (!isValid || signatureData.publicKey !== publicKey) {
      return res.status(401).json({ error: 'Invalid VRF signature' })
    }

    req.vrfAuth = {
      publicKey,
      signature: signatureData,
      verified: true,
    }

    next()
  } catch (error) {
    res.status(401).json({ error: 'Invalid VRF signature format' })
  }
}

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: Date.now(),
    version: '1.0.0',
    vrf: {
      publicKey: VrfFormatter.formatPublicKey(apiSigner.getPublicKey()),
      beacons: storage.beacons.length,
      signatures: storage.signatures.size,
    },
  })
})

// Get API information
app.get('/api/info', (req, res) => {
  res.json({
    name: 'VRF API Server',
    description: 'RESTful API for VRF operations',
    version: '1.0.0',
    endpoints: {
      'POST /api/sign': 'Sign a message with VRF',
      'POST /api/verify': 'Verify a VRF signature',
      'POST /api/batch/sign': 'Sign multiple messages',
      'POST /api/batch/verify': 'Verify multiple signatures',
      'GET /api/random/:input': 'Generate deterministic random value',
      'GET /api/beacon/current': 'Get current beacon',
      'GET /api/beacon/history': 'Get beacon history',
      'POST /api/auth/challenge': 'Create authentication challenge',
      'POST /api/auth/verify': 'Verify authentication response',
    },
    rateLimit: {
      general: '100 requests per 15 minutes',
      batch: '10 requests per 5 minutes',
    },
  })
})

// Sign a message
app.post('/api/sign', (req, res) => {
  try {
    const { message, auxData } = req.body

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Valid message string required' })
    }

    const signature = apiSigner.sign(message, auxData)
    const id = uuidv4()

    // Store signature
    storage.signatures.set(id, signature)

    res.json({
      id,
      signature: {
        message: signature.message,
        proof: signature.proof,
        hash: signature.hash,
        publicKey: signature.publicKey,
        timestamp: signature.timestamp,
        hasAuxData: !!signature.auxData,
      },
      formatted: VrfFormatter.formatSignatureResult(signature),
    })
  } catch (error) {
    res.status(500).json({ error: `Signing failed: ${error.message}` })
  }
})

// Verify a signature
app.post('/api/verify', (req, res) => {
  try {
    const { signature } = req.body

    if (!signature || !VrfValidator.isValidSignatureResult(signature)) {
      return res.status(400).json({ error: 'Valid signature object required' })
    }

    const isValid = VrfVerifier.verify(signature)

    res.json({
      valid: isValid,
      signature: VrfFormatter.formatSignatureResult(signature),
      verifiedAt: Date.now(),
    })
  } catch (error) {
    res.status(500).json({ error: `Verification failed: ${error.message}` })
  }
})

// Batch sign messages
app.post('/api/batch/sign', batchLimiter, (req, res) => {
  try {
    const { messages, auxDataFunction } = req.body

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Array of messages required' })
    }

    if (messages.length > config.maxBatchSize) {
      return res.status(400).json({
        error: `Batch size exceeds limit of ${config.maxBatchSize}`,
      })
    }

    const auxDataFn = auxDataFunction ? (msg, index) => JSON.stringify({ index, timestamp: Date.now() }) : null

    const signatures = batchProcessor.signBatch(messages, auxDataFn)
    const batchId = uuidv4()

    // Store batch
    storage.signatures.set(batchId, {
      type: 'batch',
      signatures,
      createdAt: Date.now(),
    })

    res.json({
      batchId,
      count: signatures.length,
      signatures: signatures.map((sig) => ({
        message: sig.message,
        hash: VrfFormatter.formatHash(sig.hash),
        timestamp: sig.timestamp,
      })),
      processingTime: Date.now() - signatures[0].timestamp,
    })
  } catch (error) {
    res.status(500).json({ error: `Batch signing failed: ${error.message}` })
  }
})

// Batch verify signatures
app.post('/api/batch/verify', batchLimiter, (req, res) => {
  try {
    const { signatures } = req.body

    if (!Array.isArray(signatures) || signatures.length === 0) {
      return res.status(400).json({ error: 'Array of signatures required' })
    }

    if (signatures.length > config.maxBatchSize) {
      return res.status(400).json({
        error: `Batch size exceeds limit of ${config.maxBatchSize}`,
      })
    }

    const verification = VrfVerifier.batchVerify(signatures)

    res.json({
      batchValid: verification.allValid,
      validCount: verification.validCount,
      totalCount: verification.totalCount,
      results: verification.results.map((result, index) => ({
        index,
        valid: result.valid,
        message: VrfFormatter.formatHash(result.message, 20),
        hash: VrfFormatter.formatHash(result.hash),
      })),
      verifiedAt: Date.now(),
    })
  } catch (error) {
    res.status(500).json({ error: `Batch verification failed: ${error.message}` })
  }
})

// Generate deterministic random value
app.get('/api/random/:input', (req, res) => {
  try {
    const { input } = req.params
    const { auxData } = req.query

    const randomValue = apiSigner.random(input, auxData)
    const id = uuidv4()

    // Store for verification
    storage.signatures.set(id, {
      type: 'random',
      input,
      randomValue,
      auxData,
      createdAt: Date.now(),
    })

    res.json({
      id,
      input,
      randomValue,
      formatted: VrfFormatter.formatHash(randomValue),
      hasAuxData: !!auxData,
      generatedAt: Date.now(),
    })
  } catch (error) {
    res.status(500).json({ error: `Random generation failed: ${error.message}` })
  }
})

// Get current beacon
app.get('/api/beacon/current', (req, res) => {
  try {
    const currentEpoch = Math.floor(Date.now() / config.beaconInterval)
    const currentBeacon = beacon.generateBeacon(currentEpoch)

    storage.beacons.push(currentBeacon)

    res.json({
      beacon: {
        epoch: currentBeacon.epoch,
        randomness: currentBeacon.randomness,
        beaconId: currentBeacon.beaconId,
        timestamp: currentBeacon.timestamp,
      },
      formatted: {
        randomness: VrfFormatter.formatHash(currentBeacon.randomness),
        epoch: currentBeacon.epoch,
      },
      nextBeaconIn: config.beaconInterval - (Date.now() % config.beaconInterval),
    })
  } catch (error) {
    res.status(500).json({ error: `Beacon generation failed: ${error.message}` })
  }
})

// Get beacon history
app.get('/api/beacon/history', (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 100)
    const history = storage.beacons.slice(-limit)

    res.json({
      beacons: history.map((b) => ({
        epoch: b.epoch,
        randomness: VrfFormatter.formatHash(b.randomness),
        timestamp: b.timestamp,
        timeAgo: Date.now() - b.timestamp,
      })),
      count: history.length,
      total: storage.beacons.length,
    })
  } catch (error) {
    res.status(500).json({ error: `History retrieval failed: ${error.message}` })
  }
})

// Authentication challenge
app.post('/api/auth/challenge', (req, res) => {
  try {
    const challenge = uuidv4()
    const expires = Date.now() + 5 * 60 * 1000 // 5 minutes

    storage.sessions.set(challenge, {
      challenge,
      expires,
      used: false,
    })

    res.json({
      challenge,
      expires,
      instructions: 'Sign this challenge with your VRF key and POST to /api/auth/verify',
    })
  } catch (error) {
    res.status(500).json({ error: `Challenge generation failed: ${error.message}` })
  }
})

// Verify authentication
app.post('/api/auth/verify', (req, res) => {
  try {
    const { challenge, signature } = req.body

    const session = storage.sessions.get(challenge)
    if (!session) {
      return res.status(400).json({ error: 'Invalid challenge' })
    }

    if (session.used) {
      return res.status(400).json({ error: 'Challenge already used' })
    }

    if (Date.now() > session.expires) {
      storage.sessions.delete(challenge)
      return res.status(400).json({ error: 'Challenge expired' })
    }

    const isValid = VrfVerifier.verify(signature)
    if (!isValid || signature.message !== challenge) {
      return res.status(401).json({ error: 'Invalid authentication signature' })
    }

    // Mark challenge as used
    session.used = true

    const token = Buffer.from(
      JSON.stringify({
        publicKey: signature.publicKey,
        challenge,
        authenticatedAt: Date.now(),
      }),
    ).toString('base64')

    res.json({
      authenticated: true,
      token,
      publicKey: VrfFormatter.formatPublicKey(signature.publicKey),
      expiresIn: 3600, // 1 hour
    })
  } catch (error) {
    res.status(500).json({ error: `Authentication failed: ${error.message}` })
  }
})

// Protected route example
app.get('/api/protected', vrfAuth, (req, res) => {
  res.json({
    message: 'This is a protected endpoint',
    authenticatedUser: {
      publicKey: VrfFormatter.formatPublicKey(req.vrfAuth.publicKey),
      verifiedAt: Date.now(),
    },
    data: {
      secret: 'This data is only available to authenticated users',
      timestamp: Date.now(),
    },
  })
})

// Get stored signature by ID
app.get('/api/signature/:id', (req, res) => {
  const signature = storage.signatures.get(req.params.id)

  if (!signature) {
    return res.status(404).json({ error: 'Signature not found' })
  }

  res.json({
    id: req.params.id,
    signature:
      signature.type === 'batch'
        ? { type: 'batch', count: signature.signatures.length }
        : VrfFormatter.formatSignatureResult(signature),
    retrievedAt: Date.now(),
  })
})

// Statistics endpoint
app.get('/api/stats', (req, res) => {
  res.json({
    server: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: Date.now(),
    },
    vrf: {
      signaturesStored: storage.signatures.size,
      beaconsGenerated: storage.beacons.length,
      activeSessions: storage.sessions.size,
      publicKey: VrfFormatter.formatPublicKey(apiSigner.getPublicKey()),
    },
    config: {
      beaconInterval: config.beaconInterval,
      maxBatchSize: config.maxBatchSize,
    },
  })
})

// WebSocket handling for real-time updates
wss.on('connection', (ws) => {
  console.log('WebSocket client connected')

  ws.send(
    JSON.stringify({
      type: 'welcome',
      message: 'Connected to VRF API WebSocket',
      timestamp: Date.now(),
    }),
  )

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message)

      if (data.type === 'subscribe' && data.topic === 'beacons') {
        ws.subscribeBeacons = true
        ws.send(
          JSON.stringify({
            type: 'subscribed',
            topic: 'beacons',
            timestamp: Date.now(),
          }),
        )
      }
    } catch (error) {
      ws.send(
        JSON.stringify({
          type: 'error',
          message: 'Invalid message format',
          timestamp: Date.now(),
        }),
      )
    }
  })

  ws.on('close', () => {
    console.log('WebSocket client disconnected')
  })
})

// Broadcast to WebSocket clients
function broadcast(data) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data))
    }
  })
}

// Periodic beacon generation
setInterval(() => {
  try {
    const currentEpoch = Math.floor(Date.now() / config.beaconInterval)
    const newBeacon = beacon.generateBeacon(currentEpoch)

    storage.beacons.push(newBeacon)

    // Keep only last 100 beacons
    if (storage.beacons.length > 100) {
      storage.beacons = storage.beacons.slice(-100)
    }

    // Broadcast to WebSocket subscribers
    broadcast({
      type: 'beacon',
      data: {
        epoch: newBeacon.epoch,
        randomness: VrfFormatter.formatHash(newBeacon.randomness),
        timestamp: newBeacon.timestamp,
      },
    })

    console.log(`Generated beacon for epoch ${newBeacon.epoch}`)
  } catch (error) {
    console.error('Beacon generation error:', error.message)
  }
}, config.beaconInterval)

// Cleanup expired sessions
setInterval(
  () => {
    const now = Date.now()
    for (const [challenge, session] of storage.sessions.entries()) {
      if (now > session.expires) {
        storage.sessions.delete(challenge)
      }
    }
  },
  5 * 60 * 1000,
) // Every 5 minutes

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err)
  res.status(500).json({
    error: 'Internal server error',
    timestamp: Date.now(),
  })
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path,
    method: req.method,
    timestamp: Date.now(),
  })
})

// Start server
server.listen(config.port, () => {
  console.log(`🚀 VRF API Server running on port ${config.port}`)
  console.log(`📡 WebSocket server available for real-time updates`)
  console.log(`🔑 API public key: ${VrfFormatter.formatPublicKey(apiSigner.getPublicKey())}`)
  console.log(`⏰ Beacon interval: ${config.beaconInterval / 1000} seconds`)
  console.log(`📚 API documentation: http://localhost:${config.port}/api/info`)
  console.log(`❤️  Health check: http://localhost:${config.port}/api/health`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully')
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})

module.exports = { app, server, storage }
