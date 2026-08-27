const durationMs = Number(process.env.DURATION_SECONDS || 600) * 1000;
const intervalMs = Number(process.env.INTERVAL_MS);
const counts = { ok: 0, throttled: 0, errors: 0 };
const latency = [];
const start = Date.now();
let nextReport = start + 60000;

(async () => {
  while (Date.now() - start < durationMs) {
    const before = Date.now();
    try {
      const response = await fetch('http://nginx/api', {
        // Changing a client-supplied forwarding header must not evade limits.
        headers: { 'X-Forwarded-For': `203.0.113.${counts.ok % 250 + 1}` },
        signal: AbortSignal.timeout(5000),
      });
      await response.text();
      if (response.status === 200) counts.ok++;
      else if (response.status === 429) counts.throttled++;
      else counts.errors++;
    } catch {
      counts.errors++;
    }
    latency.push(Date.now() - before);
    if (Date.now() >= nextReport) {
      console.log(JSON.stringify({ client: process.env.CLIENT, elapsedSeconds: Math.round((Date.now() - start) / 1000), ...counts }));
      nextReport += 60000;
    }
    await new Promise(resolve => setTimeout(resolve, Math.max(0, intervalMs - (Date.now() - before))));
  }
  latency.sort((a, b) => a - b);
  const passed = counts.errors === 0 && counts.ok > 0 &&
    (process.env.EXPECT_THROTTLED === 'true' ? counts.throttled > 0 : counts.throttled === 0);
  console.log(JSON.stringify({ client: process.env.CLIENT, durationMs, ...counts, p95Ms: latency[Math.floor(latency.length * .95)], passed }));
  process.exitCode = passed ? 0 : 1;
})();
