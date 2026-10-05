// altaha.shop publishes a dead AAAA record (2001:8d8:100f:f000::200 →
// ENETUNREACH/ETIMEDOUT from this sandbox) alongside a healthy IPv4 A record.
// Force ipv4-first DNS ordering for every server-side fetch (WPGraphQL data +
// any upstream optimizer traffic) so Node stops stalling on unreachable
// IPv6 addresses. Browser-side loads are unaffected (the user's own browser
// does its own happy-eyeballs negotiation).
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const dns = await import('node:dns');
    dns.setDefaultResultOrder('ipv4first');
  }
}
