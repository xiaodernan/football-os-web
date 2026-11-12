package com.footballos.cache;

/**
 * The Java wire twin of the analysis layer's seeded randomness (M1076).
 *
 * domain/cache.ts's {@code expiryWithJitter} derives a key's write-back lifetime from
 * {@code makeRng(`${seed}:${key}:${now}`)} — lib/rng.ts's FNV-1a {@code hashString} feeding a
 * mulberry32. Both are reproduced here with 32-bit overflow semantics, so the cache tier that
 * ACTUALLY talks to Redis scatters its TTLs by the same deterministic, reproducible rule the
 * CacheObservatory draws on the screen. Keys written in the same second no longer expire in the
 * same second — the thundering-herd defence stops being a picture and becomes the write-back.
 *
 * Pure and static: no clock, no socket, no state. The caller supplies `nowSecond`; proof-cache-
 * parity recounts the same algorithm in JS and checks the two agree field for field.
 */
final class CacheJitter {

    private static final int FNV_OFFSET = 0x811c9dc5; // 2166136261 — lib/rng.ts hashString
    private static final int FNV_PRIME = 0x01000193;  // 16777619
    private static final long MULBERRY_STEP = 0x6d2b79f5L;

    private CacheJitter() { }

    /** FNV-1a over UTF-16 code units, wrapped in a signed int — byte-for-byte lib/rng.ts hashString. */
    static long fnv1a(String s) {
        int h = FNV_OFFSET;
        for (int i = 0; i < s.length(); i++) {
            h ^= s.charAt(i);
            h *= FNV_PRIME; // Java int overflow == Math.imul low-32 bits
        }
        return h & 0xffffffffL;
    }

    /** mulberry32 — the 32-bit-overflow twin of lib/rng.ts makeRng(seed)(). */
    static double mulberry32(long seed) {
        int a = (int) (seed & 0xffffffffL);
        a = (int) (a + MULBERRY_STEP);
        int t = (a ^ (a >>> 15)) * (1 | a);
        t = (t + ((t ^ (t >>> 7)) * (61 | t))) ^ t;
        // Java `int >>> 0` stays a SIGNED int; TS `>>> 0` yields a uint32. Widen to an unsigned
        // long FIRST or a negative draw would produce a negative TTL. This is the wire parity seam.
        return ((t ^ (t >>> 14)) & 0xffffffffL) / 4294967296.0;
    }

    /** The write-back lifetime: ttl + floor(draw * (jitter+1)), hence within [ttl, ttl+jitter]. */
    static long jitteredTtlSeconds(String key, long nowSecond, long ttl, long jitter, String seed) {
        if (jitter <= 0) return ttl;
        double draw = mulberry32(fnv1a(seed + ":" + key + ":" + nowSecond));
        return ttl + (long) Math.floor(draw * (jitter + 1));
    }
}
