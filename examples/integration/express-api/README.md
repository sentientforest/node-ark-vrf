# VRF Express.js API Server

A production-ready RESTful API server that demonstrates VRF integration with Express.js. This example showcases how to build secure, verifiable randomness services using VRF technology.

## Features

- 🔐 **VRF Signing & Verification**: Complete VRF lifecycle management
- ⚡ **Batch Operations**: High-throughput batch processing
- 🎲 **Random Beacon**: Periodic verifiable randomness generation
- 🔒 **VRF Authentication**: Cryptographic authentication using VRF signatures
- 📡 **WebSocket Support**: Real-time updates for beacon generation
- 🛡️ **Security**: Rate limiting, CORS, Helmet security headers
- 📊 **Monitoring**: Health checks, statistics, and performance metrics
- 🧪 **Testing**: Comprehensive test suite and load testing

## Quick Start

### Installation

```bash
cd examples/integration/express-api
npm install
```

### Start the Server

```bash
npm start
# or for development with auto-restart
npm run dev
```

The server will start on `http://localhost:3000`

### Test the API

```bash
# Run the test suite
npm test

# Run with performance testing
node test-client.js --performance

# Run with load testing
node test-client.js --load
```

## API Endpoints

### Core VRF Operations

#### `POST /api/sign`

Sign a message with VRF.

```bash
curl -X POST http://localhost:3000/api/sign \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, VRF!", "auxData": "optional-context"}'
```

Response:

```json
{
  "id": "uuid-here",
  "signature": {
    "message": "Hello, VRF!",
    "proof": "hex-encoded-proof",
    "hash": "deterministic-hash",
    "publicKey": "server-public-key",
    "timestamp": 1699123456789
  }
}
```

#### `POST /api/verify`

Verify a VRF signature.

```bash
curl -X POST http://localhost:3000/api/verify \
  -H "Content-Type: application/json" \
  -d '{"signature": {...}}'
```

#### `GET /api/random/:input`

Generate deterministic random value.

```bash
curl http://localhost:3000/api/random/my-input?auxData=context
```

### Batch Operations

#### `POST /api/batch/sign`

Sign multiple messages in batch.

```bash
curl -X POST http://localhost:3000/api/batch/sign \
  -H "Content-Type: application/json" \
  -d '{"messages": ["msg1", "msg2", "msg3"]}'
```

#### `POST /api/batch/verify`

Verify multiple signatures in batch.

```bash
curl -X POST http://localhost:3000/api/batch/verify \
  -H "Content-Type: application/json" \
  -d '{"signatures": [...]}'
```

### Random Beacon

#### `GET /api/beacon/current`

Get the current random beacon.

```bash
curl http://localhost:3000/api/beacon/current
```

#### `GET /api/beacon/history`

Get beacon history.

```bash
curl http://localhost:3000/api/beacon/history?limit=10
```

### Authentication

#### `POST /api/auth/challenge`

Request an authentication challenge.

```bash
curl -X POST http://localhost:3000/api/auth/challenge
```

#### `POST /api/auth/verify`

Verify authentication response.

```bash
curl -X POST http://localhost:3000/api/auth/verify \
  -H "Content-Type: application/json" \
  -d '{"challenge": "uuid", "signature": {...}}'
```

#### `GET /api/protected`

Access protected endpoint (requires VRF authentication).

```bash
curl http://localhost:3000/api/protected \
  -H "x-vrf-signature: base64-encoded-signature" \
  -H "x-vrf-public-key: hex-public-key"
```

### System

#### `GET /api/health`

Health check endpoint.

#### `GET /api/info`

API information and documentation.

#### `GET /api/stats`

Server and VRF statistics.

#### `GET /api/signature/:id`

Retrieve stored signature by ID.

## WebSocket API

Connect to `ws://localhost:3000` for real-time updates.

### Subscribe to Beacon Updates

```javascript
const ws = new WebSocket('ws://localhost:3000')

ws.on('open', () => {
  ws.send(
    JSON.stringify({
      type: 'subscribe',
      topic: 'beacons',
    }),
  )
})

ws.on('message', (data) => {
  const message = JSON.parse(data)
  if (message.type === 'beacon') {
    console.log('New beacon:', message.data)
  }
})
```

## Configuration

Environment variables:

- `PORT`: Server port (default: 3000)
- `VRF_SEED`: VRF seed for server key generation (default: demo seed)

## Security Features

### Rate Limiting

- General API: 100 requests per 15 minutes per IP
- Batch operations: 10 requests per 5 minutes per IP

### VRF Authentication

The server supports cryptographic authentication using VRF signatures:

1. Request a challenge from `/api/auth/challenge`
2. Sign the challenge with your VRF key
3. Submit the signed challenge to `/api/auth/verify`
4. Use the returned token for authenticated requests

### Security Headers

- Helmet.js for security headers
- CORS support for cross-origin requests
- Input validation and sanitization

## Usage Examples

### Basic VRF Operations

```javascript
const { VrfSigner } = require('../../utils/vrf-helpers')

// Client-side signer
const signer = new VrfSigner('client-seed')

// Sign a message
const signature = signer.sign('my-message')

// Verify with API
const response = await fetch('http://localhost:3000/api/verify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ signature }),
})

const result = await response.json()
console.log('Valid:', result.valid)
```

### Authentication Flow

```javascript
// 1. Get challenge
const challengeResponse = await fetch('http://localhost:3000/api/auth/challenge', {
  method: 'POST',
})
const { challenge } = await challengeResponse.json()

// 2. Sign challenge
const signature = signer.sign(challenge)

// 3. Verify authentication
const authResponse = await fetch('http://localhost:3000/api/auth/verify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ challenge, signature }),
})

const { token } = await authResponse.json()

// 4. Use token for authenticated requests
const protectedResponse = await fetch('http://localhost:3000/api/protected', {
  headers: {
    'x-vrf-signature': Buffer.from(JSON.stringify(signature)).toString('base64'),
    'x-vrf-public-key': signer.getPublicKey(),
  },
})
```

### Batch Processing

```javascript
// Process large dataset
const messages = Array.from({ length: 100 }, (_, i) => `item-${i}`)

const batchResponse = await fetch('http://localhost:3000/api/batch/sign', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ messages }),
})

const { signatures } = await batchResponse.json()
console.log(`Processed ${signatures.length} items`)
```

### Random Beacon Consumer

```javascript
// Get current beacon
const beaconResponse = await fetch('http://localhost:3000/api/beacon/current')
const { beacon } = await beaconResponse.json()

// Use beacon randomness for lottery
function selectWinner(participants, beaconRandomness) {
  const hash = beaconRandomness
  const hashValue = BigInt('0x' + hash.substring(0, 16))
  const index = Number(hashValue % BigInt(participants.length))
  return participants[index]
}

const winner = selectWinner(['Alice', 'Bob', 'Charlie'], beacon.randomness)
console.log('Winner:', winner)
```

## Performance

### Typical Performance Metrics

On modern hardware (MacBook Pro M1):

- Sign operation: ~5ms
- Verify operation: ~3ms
- Batch operations: ~50 ops/second
- Beacon generation: ~10ms

### Load Testing

```bash
# Test with concurrent requests
node test-client.js --load

# Performance benchmark
node test-client.js --performance
```

### Optimization Tips

1. **Use batch operations** for multiple items
2. **Cache signatures** when possible
3. **Implement connection pooling** for high traffic
4. **Use WebSockets** for real-time updates
5. **Scale horizontally** with load balancers

## Production Deployment

### Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
EXPOSE 3000

CMD ["npm", "start"]
```

### Environment Setup

```bash
# Production environment variables
export PORT=3000
export VRF_SEED="your-secure-production-seed"
export NODE_ENV=production
```

### Monitoring

```bash
# Health check endpoint
curl http://localhost:3000/api/health

# Statistics monitoring
curl http://localhost:3000/api/stats
```

### Database Integration

For production use, replace in-memory storage with a database:

```javascript
// Example with MongoDB
const mongoose = require('mongoose')

const SignatureSchema = new mongoose.Schema({
  signatureId: { type: String, unique: true },
  message: String,
  proof: String,
  hash: String,
  publicKey: String,
  timestamp: Date,
  auxData: String,
})

const Signature = mongoose.model('Signature', SignatureSchema)

// Store signature
await new Signature({
  signatureId: id,
  ...signature,
}).save()
```

## Integration Patterns

### Express Middleware

```javascript
const { VrfSigner, VrfVerifier } = require('../utils/vrf-helpers')

function vrfMiddleware(seed) {
  const signer = new VrfSigner(seed)

  return (req, res, next) => {
    req.vrf = {
      sign: (message, auxData) => signer.sign(message, auxData),
      verify: (signature) => VrfVerifier.verify(signature),
      random: (input) => signer.random(input),
    }
    next()
  }
}

app.use(vrfMiddleware(process.env.VRF_SEED))
```

### Database Middleware

```javascript
function vrfDatabase(db, seed) {
  const signer = new VrfSigner(seed)

  return {
    async storeVerifiable(table, data) {
      const signature = signer.sign(JSON.stringify(data))
      return db.insert(table, { ...data, vrfSignature: signature })
    },

    async verifyRecord(record) {
      return VrfVerifier.verify(record.vrfSignature)
    },
  }
}
```

### Microservice Integration

```javascript
// API Gateway with VRF
app.use(
  '/api/vrf',
  createProxyMiddleware({
    target: 'http://vrf-service:3000',
    changeOrigin: true,
    pathRewrite: { '^/api/vrf': '/api' },
  }),
)

// Load balancer with VRF validation
app.use('/api/verified', (req, res, next) => {
  const signature = req.headers['x-vrf-signature']
  if (signature && VrfVerifier.verify(signature)) {
    next()
  } else {
    res.status(401).json({ error: 'VRF verification required' })
  }
})
```

## Error Handling

### Common Error Responses

- `400 Bad Request`: Invalid input data
- `401 Unauthorized`: VRF authentication failed
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server-side error

### Error Recovery

```javascript
// Retry logic for critical operations
async function robustVrfOperation(operation, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      if (attempt === maxRetries) throw error
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt))
    }
  }
}
```

## Troubleshooting

### Common Issues

1. **"VRF_SEED not set"**: Set the VRF_SEED environment variable
2. **"Rate limit exceeded"**: Reduce request frequency or implement backoff
3. **"Invalid signature"**: Ensure message and auxData match exactly
4. **"WebSocket connection failed"**: Check firewall and proxy settings

### Debug Mode

```bash
# Enable debug logging
DEBUG=vrf:* npm start

# Verbose error reporting
NODE_ENV=development npm start
```

### Performance Issues

1. Check system resources (CPU, memory)
2. Monitor request latency
3. Analyze batch operation sizes
4. Review rate limiting configuration
