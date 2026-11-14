package com.footballos.discipline;

import java.io.IOException;
import java.io.InputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

import org.springframework.core.io.ClassPathResource;

/**
 * The validator an HTTP reader asks for: the SHA-256 of the exact contract bytes this process
 * loaded, named with the algorithm that produced it.
 *
 * It is computed once, at construction, from the bytes — not from a filename, a version string or
 * a build timestamp. Three properties the endpoints lean on:
 *
 *   · it changes when and only when the frozen contract changes, so a client holding an old
 *     validator is told, truthfully, that its copy is stale;
 *   · it never changes on its own, so repeated polls of an unmodified world keep answering 304 with
 *     an empty body instead of re-sending the same kilobytes over and over;
 *   · it says nothing about a response that is not the contract. An endpoint whose body mixes in a
 *     live counter must NOT borrow this value: two identical validators would then sit on bodies
 *     that differ, which is the one thing a validator is not allowed to do. That boundary is
 *     charged by scripts/proof-http-validators.mjs, not by a comment.
 *
 * Deliberately absent: Last-Modified. A classpath entry's timestamp is the build's, not the
 * document's, so it would move whenever the jar is repackaged — a validator that changes while the
 * bytes do not teaches the client to re-fetch for nothing.
 *
 * Not promised either: the wildcard If-None-Match. Spring's conditional check compares a named
 * validator and "*" names none, so a reader sending the wildcard is answered with the whole
 * document. RFC 9110 would allow a 304 for a representation that has a validator; this server keeps
 * the direction that cannot be wrong, and scripts/verify-conditional-get-live.mjs measures which way
 * that is instead of assuming it.
 *
 * The byte source is the same stream the endpoint parses, so the digest and the document cannot
 * disagree about which file they came from.
 */
public final class ContractDigest {

    /** The prefix names the algorithm on the wire, the way the contract's own digest field does. */
    public static final String ALGORITHM = "sha256-";

    private final String value;

    public ContractDigest(String resource) throws IOException {
        try (InputStream in = new ClassPathResource(resource).getInputStream()) {
            this.value = hex(sha256(in.readAllBytes()));
        }
    }

    /** The value handed to {@code ResponseEntity.eTag}; Spring adds the quotes the wire wants. */
    public String value() {
        return ALGORITHM + value;
    }

    private static byte[] sha256(byte[] bytes) {
        try {
            return MessageDigest.getInstance("SHA-256").digest(bytes);
        } catch (NoSuchAlgorithmException e) {
            // SHA-256 is in every JLS-mandated provider set; reaching here means the JVM itself is
            // broken, and a service that cannot name its bytes should not pretend to serve them.
            throw new IllegalStateException("no SHA-256 in this runtime", e);
        }
    }

    private static String hex(byte[] digest) {
        return HexFormat.of().formatHex(digest);
    }
}
