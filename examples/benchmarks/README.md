# VRF Performance Benchmarks

This directory contains comprehensive performance benchmarks for the VRF library operations.

## Quick Start

```bash
# Run basic benchmarks
node performance.js

# Run with detailed progress output
node performance.js --verbose

# Run with memory analysis (requires Node.js flag)
node --expose-gc performance.js
```

## Benchmark Categories

### Core Operations

- **Keypair Generation**: Time to generate VRF keypairs from seeds
- **Proof Generation**: Time to create VRF proofs for messages
- **Proof Verification**: Time to verify VRF proofs
- **Proof-to-Hash**: Time to convert proofs to deterministic hash outputs

### Advanced Features

- **Auxiliary Data Operations**: Performance with additional context data
- **Batch Operations**: Throughput for multiple operations
- **Variable Message Sizes**: Performance scaling with input size

### System Analysis

- **Memory Usage**: Memory consumption patterns and garbage collection
- **Stress Testing**: Sustained operation performance over time
- **Comparative Analysis**: Performance across different input characteristics

## Interpreting Results

### Key Metrics

- **Mean (ms)**: Average operation time
- **Median (ms)**: Middle value (less affected by outliers)
- **P95/P99 (ms)**: 95th/99th percentile latency (tail performance)
- **Ops/sec**: Operations per second throughput
- **Std Dev**: Consistency indicator (lower is more consistent)

### Expected Performance

Typical performance on modern hardware:

| Operation          | Expected Range | Notes                            |
| ------------------ | -------------- | -------------------------------- |
| Keypair Generation | 1-5 ms         | CPU-intensive, depends on system |
| Proof Generation   | 2-10 ms        | Most expensive operation         |
| Proof Verification | 1-5 ms         | Generally faster than proving    |
| Proof-to-Hash      | 0.1-1 ms       | Lightweight hash operation       |

### Performance Factors

#### Hardware Impact

- **CPU**: Single-threaded performance matters most
- **Memory**: Affects garbage collection frequency
- **Architecture**: x64 generally faster than ARM

#### Input Characteristics

- **Message Size**: Minimal impact on core operations
- **Auxiliary Data**: Small overhead for context binding
- **Batch Size**: Amortizes setup costs for large batches

## Optimization Guidelines

### For High Throughput

- Batch operations when possible
- Reuse keypairs across multiple operations
- Minimize auxiliary data size
- Use worker threads for parallel processing

### For Low Latency

- Pre-generate keypairs when possible
- Avoid garbage collection during critical operations
- Use smaller message sizes
- Monitor P95/P99 latencies

### Memory Optimization

- Avoid storing large numbers of proofs in memory
- Use streaming for batch operations
- Enable garbage collection monitoring
- Consider proof caching strategies

## Running Custom Benchmarks

### Basic Custom Benchmark

```javascript
const { BenchmarkRunner, Timer } = require('./performance')

const runner = new BenchmarkRunner()

// Custom operation benchmark
await runner.runBenchmark(
  'My Operation',
  () => {
    // Your VRF operation here
    const keypair = vrf.generateKeypairFromSeed('test')
    return vrf.vrfProve(keypair.secretKey, 'message')
  },
  1000,
) // 1000 iterations
```

### Memory Profiling

```javascript
const { Timer } = require('./performance')

function profileMemory(operation, iterations = 1000) {
  const timer = new Timer()
  const startMem = process.memoryUsage()

  timer.start()
  for (let i = 0; i < iterations; i++) {
    operation()
  }
  const duration = timer.stop()

  const endMem = process.memoryUsage()

  return {
    duration,
    memoryDelta: endMem.heapUsed - startMem.heapUsed,
    operationsPerSecond: iterations / (duration / 1000),
  }
}
```

## Performance Monitoring

### Continuous Integration

Add to your CI pipeline:

```yaml
# .github/workflows/performance.yml
- name: Run Performance Benchmarks
  run: |
    node examples/benchmarks/performance.js > perf-results.txt
    # Upload or analyze results
```

### Production Monitoring

```javascript
// Simple performance monitoring
const startTime = process.hrtime.bigint()
const proof = vrf.vrfProve(secretKey, message)
const duration = Number(process.hrtime.bigint() - startTime) / 1_000_000

if (duration > 50) {
  // Alert if > 50ms
  console.warn(`Slow VRF operation: ${duration.toFixed(2)}ms`)
}
```

## Troubleshooting

### Poor Performance

1. **Check system resources**: CPU/memory utilization
2. **Verify Node.js version**: Use latest LTS
3. **Profile garbage collection**: Run with `--trace-gc`
4. **Check for memory leaks**: Monitor heap growth
5. **Test without auxiliary data**: Isolate performance issues

### Inconsistent Results

1. **Run multiple times**: Results can vary between runs
2. **Increase iterations**: More samples = better statistics
3. **Check system load**: Other processes affecting performance
4. **Use verbose mode**: Monitor progress and outliers

### Platform Differences

Performance can vary significantly between:

- **Operating systems**: Linux often fastest, Windows varies
- **Architectures**: x64 vs ARM vs Apple Silicon
- **Node.js versions**: V8 optimizations improve over time

## Contributing

When adding new benchmarks:

1. Follow the existing patterns in `performance.js`
2. Include statistical analysis with `Statistics.analyze()`
3. Add appropriate warmup iterations
4. Document expected performance characteristics
5. Test on multiple platforms if possible
