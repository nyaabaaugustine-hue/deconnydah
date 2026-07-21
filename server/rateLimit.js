const store = new Map();
export function rateLimit({ windowMs = 15 * 60 * 1000, max = 100, message = 'Too many requests, please try again later.', } = {}) {
    return (req, res, next) => {
        const key = req.ip || req.socket.remoteAddress || 'unknown';
        const now = Date.now();
        const entry = store.get(key);
        if (!entry || now > entry.resetAt) {
            store.set(key, { count: 1, resetAt: now + windowMs });
            return next();
        }
        entry.count++;
        if (entry.count > max) {
            res.setHeader('Retry-After', Math.ceil((entry.resetAt - now) / 1000));
            return res.status(429).json({ error: message });
        }
        next();
    };
}
// Cleanup stale entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
        if (now > entry.resetAt)
            store.delete(key);
    }
}, 5 * 60 * 1000).unref();
