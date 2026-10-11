import { z } from 'zod'

// Zod's JIT probes `new Function()` while schemas are built. Our CSP has no 'unsafe-eval', so the probe
// is blocked and Chrome logs a CSP violation. Disable the JIT before any schema is created.
z.config({ jitless: true })
