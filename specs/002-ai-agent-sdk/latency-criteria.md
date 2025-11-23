# Latency Measurement & Acceptance Criteria

End-to-end latency targets (real-time real-user scenarios):
- Average latency: < 200 ms per message exchange (user -> agent -> response)
- 90th percentile latency: < 250 ms
- Maximum latency: < 500 ms

Measurement scope:
- End-to-end measurement from user message send to agent response received
- Include client network jitter; exclude initial cold-start caching latencies unless specified

Test harness:
- Simulate 100 concurrent users sending messages at a steady rate (inter-arrival ~10 ms) for 60 seconds
- Use synthetic data streams to exercise typical agent workloads

Validation criteria:
- All latency metrics meet targets under load; alert if any metric breaches thresholds
- Document results in a run log with summary charts (average, p95, p99, max) per run
