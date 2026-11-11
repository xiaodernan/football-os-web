# The platform runbook — how to boot and verify the Spring Cloud stack

> M1042: this file is the operator's half of what `scripts/verify-services.mjs` automates.
> The SPA never calls these services; the runbook is for a human who wants to watch the stack
> behave, not for the web build. Nothing here is started by `npm run dev`, `npm run build` or
> any screen. PLATFORM_LIVE stays false by design and this file changes nothing about that.

## What the stack is

The reactor is **seven Maven modules plus two out-of-reactor broker processes**. All seven modules boot
on the host with plain `java -jar` — the two broker-dependent ones boot against a dead port and
**degrade honestly** instead of pretending. Only compose / CI brings all seven modules and both brokers
up together. `domain/platform.ts` is the descriptor
every port and dependency edge is checked against (`proof-services.mjs`, `proof-boot-order.mjs`).

| Module | artifactId | Port | Registers with Eureka | Serves | Host `verify-services.mjs` |
|---|---|---|---|---|---|
| `services/eureka-server` | `eureka-server` | **8761** | no — the registry never registers itself | the registry | boots |
| `services/config-server` | `config-server` | **8888** | yes | a native classpath repository (`config-repo/application.yml`) | boots |
| `services/league-service` | `league-service` | **8081** | yes | `GET /league/summary` — the frozen counts contract; `GET /league/table(/{comp})` — the frozen tables | boots |
| `services/discipline-service` | `discipline-service` | **8082** | yes | `GET /discipline/clock(/{comp})` — the frozen card clocks | boots |
| `services/gateway` | `gateway` | **8087** | yes | the edge: `/api/league/**`, `/api/discipline/**`, `/api/cache/**`, `/api/messaging/**` → `lb://` targets | boots (last, on purpose) |
| `services/cache-service` | `cache-service` | **8083** | yes | `GET /cache/league/summary` — read-through Redis cache of the frozen league contract; `/stats` (honest `redisUp`), `POST /evict` | boots; degraded mode (`redisUp:false`, origin read) against a dead broker port, never the foreign stack |
| `services/messaging-service` | `messaging-service` | **8084** | yes | `GET /messaging/summary\|/stats\|/policy`, `POST /publish` — Spring Cloud Stream over RabbitMQ | boots; binder reports DOWN, observe surfaces answer honestly (`live:false`) |

| External process | Image | Ports | Why the reactor needs it | Host verifier |
|---|---|---|---|---|
| Redis | `redis:7-alpine` | **6379** | the cache tier's `StringRedisTemplate` (RESP over netty via Lettuce), TTL + read-through | not started — this host's 6379 is a port another Docker Desktop workload publishes (this project's compose is not running), so the host verifier spawns the cache tier against a dead port instead of dialing a broker that isn't this reactor's |
| RabbitMQ | `rabbitmq:3-management-alpine` | **5672** / **15672** | the messaging tier's Stream binder (partition key, consumer group, retry back-off, DLQ, prefetch) | not started — the same Docker Desktop publishes 5672 for another workload and it refuses default credentials; the verifier spawns the messaging tier against a dead port and the binder reports DOWN honestly |

The gateway cannot live on 8080 on this machine — `com.docker.backend.exe` (Docker Desktop)
binds that port. Everything else is stock. The gateway is booted **last** even though its only
dependency is the registry: booting it before the domain services earns a Eureka/LB cache window
where `lb://LEAGUE-SERVICE` resolves to nobody. `verify-services.mjs` keeps that operational order
as a named decision and checks it is still a valid topological order every run.

## Build

```sh
mvn -DskipTests package -f services/pom.xml
```

**Seven** fat jars land in `services/*/target/` (roughly 47–61 MB each; messaging carries the
Stream + Rabbit binder). The Dockerfiles in each module build the same reactor from the same poms
(`docker build -f services/<module>/Dockerfile services/`), and `services/docker-compose.yml` wires
all seven modules **plus `redis` and `rabbitmq`** with the same ports in dependency order — with
the environment overrides below, which are mandatory inside containers (localhost would point each
service at itself):

```sh
docker compose -f services/docker-compose.yml up --build
```

> **Honest Docker status on this machine (2026-11-10).** `docker compose -f services/docker-compose.yml config`
> validates. The full `up --build` was attempted twice on this machine (30- and 40-minute windows):
> every image pull stalled and even a local, cached `alpine:3` `docker run` did not finish inside
> its timeout on 2026-11-10 (the host's other containers — Career OS on 3000/8000/8080 and a
> pgvector database — keep running; the registry path for new images is the thing that is
> impaired). `8080` on this host is also occupied by that Career OS backend, which is a second,
> unrelated reason the gateway was moved to `8087`. The compose stack is therefore **statically
> validated and structurally current but not container-executed on this machine** — treat the
> Dockerfiles as correct-by-construction (all seven poms copied, `-pl <module> -am`, one entrypoint)
> and exercise the stack with `node scripts/verify-services.mjs`, which boots all seven jars on the
> host (the two broker-dependent ones against a dead port, in degraded mode), and is the runnable truth for
> this environment. If a registry-healthy machine is available,
> `docker compose -f services/docker-compose.yml up --build` is the one-command equivalent.

## Boot by hand (dependency order)

The order is **derived from the `dependsOn` edges**, not memorised: `scripts/lib/boot-order.mjs`
runs Kahn's algorithm over the seven-node DAG in `domain/platform.ts` and the verifier refuses to
start if its chosen order puts any node before a dependency (or if the DAG has a cycle or a dangling
edge). The canonical order is:

```
registry -> config -> gateway -> league -> discipline -> cache -> messaging
```

The host verifier keeps one deliberate deviation — **gateway last** — for the LB cache reason above;
`assertBootOrder` confirms that deviation is still a valid topological order. All seven jars,
in the verifier's operational order (gateway last, the broker pair against a dead port):

```sh
java -jar services/eureka-server/target/eureka-server-0.1.0.jar    # registry, wait ~15s
java -jar services/config-server/target/config-server-0.1.0.jar    # config,   wait ~8s
java -jar services/league-service/target/league-service-0.1.0.jar  # league,   wait ~10s
java -jar services/discipline-service/target/discipline-service-0.1.0.jar
java -jar services/cache-service/target/cache-service-0.1.0.jar     # degraded: no Redis, origin reads
java -jar services/messaging-service/target/messaging-service-0.1.0.jar  # degraded: no broker, live:false
java -jar services/gateway/target/gateway-0.1.0.jar                # gateway LAST
```

`cache-service` (8083) serves the frozen contract from origin with `redisUp:false` when Redis is
absent, and `messaging-service` (8084) binds against a dead broker and reports it on its observe
surfaces — both boot, neither pretends. On this host those two processes must never dial 6379/5672
because another Docker Desktop workload publishes both ports and refuses default credentials;
`verify-services.mjs` spawns them with `SPRING_DATA_REDIS_PORT=3999` / `SPRING_RABBITMQ_PORT=3999`
(a port nothing occupies) for exactly that reason. Delete those two spawn-time overrides on a host
that runs its own Redis/RabbitMQ to watch the live-broker path instead. The compose stack is the
one-command equivalent on a registry-healthy machine:

```sh
docker compose -f services/docker-compose.yml up --build
```

Or run the whole host verification in one command, which is what the runbook recommends:

```sh
node scripts/verify-services.mjs
```

`verify-services.mjs` checks the jars exist, validates the topological order, boots all seven
services (gateway last, the broker pair against a dead port in degraded mode), and then walks the checklist below
automatically — including the two gateway round-trips `/api/cache/league/summary` and
`/api/messaging/summary` through `lb://`.

## What "healthy" means here, in order

> A note on pacing: the gateway caches the Eureka registry (default refresh 30–35s), so a
> freshly-booted stack can answer `No servers available for service: LEAGUE-SERVICE` for one
> cache window while a full round-trip already works. The health check passing is not the same
> as the load balancer seeing the league — poll, don't assume. `verify-services.mjs` does this
> for you.

1. `GET http://localhost:8761/actuator/health` → `{"status":"UP"}` — the registry.
2. `GET http://localhost:8888/actuator/health` → `{"status":"UP"}` — the config server.
3. `GET http://localhost:8888/league-service/default` → the property tree the league
   service imports, served from `config-repo/application.yml`:

   ```json
   {"name":"league-service","profiles":["default"],"propertySources":[{"name":"classpath:/config-repo/application.yml","source":{"footballos.world.label":"Demo World R1","footballos.world.seasons":0,"footballos.league.contract-resource":"league-summary.json","footballos.league.tables-resource":"league-tables.json"}}]}
   ```

4. `GET http://localhost:8081/actuator/info` → `app.world` must print `Demo World R1` —
   proof the value arrived via the config server, not compiled code:

   ```json
   {"app":{"name":"league-service","version":"0.1.0","world":"Demo World R1","description":"The read-only league service ..."}}
   ```

5. Direct read: `GET http://localhost:8081/league/summary` → the frozen contract
   (counts + sha256 digest), identical bytes to
   `services/league-service/src/main/resources/league-summary.json`.

5a. Tables: `GET http://localhost:8081/league/table` → which frozen tables exist; the file
    behind it is `services/league-service/src/main/resources/league-tables.json` (15 standard
    3-1-0 tables, one per competition, computed by `scripts/export-service-contract.mjs`
    from the same provider). One competition: `GET http://localhost:8081/league/table/ucl` →
    the rows, byte-identical to that file. Unknown competition: 404.

6. Through the edge: `GET http://localhost:8087/api/league/summary` → the same summary bytes;
   `GET http://localhost:8087/api/league/table/ucl` → the same table rows. Two routes share
   `LEAGUE-SERVICE` (upper-cased by the registry; `lb://LEAGUE-SERVICE` resolves it at request
   time), and both strip exactly one segment (`StripPrefix=1`), which is why the controllers
   map `/league` and `/league/table`, not `/api/league`. The table route matches
   `/api/league/table/**` and is ordered `order: 0` ahead of the `/api/league/**` summary
   route (`order: 1`), so the more specific predicate wins regardless of declaration order.
   Both routes carry the same `leagueSummary` circuit — one domain service, one breaker —
   and both forward to `/fallback` when it opens.

7. Tearing the stack down: stop `league-service`, then call `/api/league/summary` again.
   The gateway's circuit (sliding window 3, minimum 2 calls, open for 1s) forwards the call
   to `/fallback`, whose canned body is:

   ```json
   {"error":"league-service is quiet and the gateway circuit is open","status":"SERVICE_UNAVAILABLE","detail":"no hung call will be made to the dead service while this body stands"}
   ```

   The status is 503 and the content-type is application/json. No `500`s, no hung threads —
   that is the entire point of the breaker.

8. Broker-deprived witnesses (the honest degraded mode; run with `SPRING_DATA_REDIS_PORT=3999` and
   `SPRING_RABBITMQ_PORT=3999` if you boot them by hand on this host, or against your own broker pair
   if 6379/5672 belong to this reactor):
   `GET http://localhost:8083/actuator/health` → 503 (`{"status":"DOWN"}`) **only because Redis is
   absent**; anything else means something in this path drifted — the gateway, the contract, the
   health wiring. `GET http://localhost:8083/cache/league/summary` → the frozen league summary
   (byte-equal), served from origin; `GET http://localhost:8083/cache/league/stats` → `redisUp:false`,
   counters as integers — the two endpoints must agree about the broker.
   `GET http://localhost:8084/actuator/health` → 503 (`binders.rabbit.status=DOWN`; the foreign
   RabbitMQ on 5672 refuses default credentials, or none is listening); `GET http://localhost:8084/messaging/summary`
   → `{"exchange":"footballos.events","dlq":"footballos.events.dlq","live":false,...}`;
   `GET http://localhost:8084/messaging/policy` → `{"baseDelay":20,"capDelay":640,"rung3":80,...}` —
   the exact ladder `domain/queue.ts` runs under (`rawBackoff(3)===80`). Through the edge:
   `GET http://localhost:8087/api/cache/league/summary` and `GET http://localhost:8087/api/messaging/summary`
   → the same bodies, resolved through `lb://` the same way as the league routes
   (`/api/cache/**`, `/api/messaging/**` with StripPrefix=1).

## M1070 — the LIVE Redis witness (read-through, eviction, bounded degrade)

`verify-services.mjs` proves the honest **DOWN** floor: all seven jars boot, the cache tier serves
origin with `redisUp:false` against a dead `:3999`. That is deliberately brokerless. `scripts/verify-redis-live.mjs`
is the complementary **live** witness — it starts a project-owned Redis and drives a real
cache-service against it, so read-through, eviction, TTL and the outage path are all measured against
a broker that actually answered. It is not part of `npm run proof` (it starts Docker + a jar, ~1 min);
like `verify-services.mjs` it is the runnable truth this section documents.

**Why it exists — a real defect, measured.** Lettuce's DEFAULT command timeout is **60s**. With
Redis down, every `/cache/league/summary` parked a Tomcat worker for that whole minute; a few
concurrent misses exhausted the pool and the tier stopped answering **even after Redis came back**.
Witnessed live before the fix: one degraded read took **61s** and the service stayed unresponsive
post-recovery. `application.yml` now pins `spring.data.redis.timeout: 2s` and `connect-timeout: 2s`,
and this script refuses to pass unless the degraded round-trip stays under an 8s budget.

```sh
# build once, then run the live witness from the repo root
mvn -DskipTests package -f services/pom.xml
node scripts/verify-redis-live.mjs           # leaves the Redis container running
node scripts/verify-redis-live.mjs --clean   # removes the container at the end
```

**Port hygiene (non-negotiable on this host).** 6379/5672 belong to a foreign Docker Desktop
workload (a Career OS stack) and are **never dialed**. The script starts `footballos-redis-live`
bound **only** to `127.0.0.1:16379:6379` (`redis:7-alpine --save '' --appendonly no`), spawns a fresh
`cache-service` jar with `SPRING_DATA_REDIS_PORT=16379` and **no timeout override** (so it is the
packaged yml bounds under test, not an env crutch), reuses a surviving container, and kills its own
jar + restores the container in a `finally`/SIGINT handler so a failed assertion never leaves the
broker down.

**What it asserts (17 checks, all measured against the live broker):**

| Phase |断言 / response |
|---|---|
| boot | `redisUp:true`, `requests:0`, `ttl:60` from a fresh jar with no timeout env |
| cold miss | `misses:1`, Redis `EXISTS=1`, `TYPE=string`, `TTL` in (0,60]; body = frozen contract byte-for-byte |
| warm hit | `hits:1`, `hitRate:50`, origin untouched; a **planted sentinel key** is echoed verbatim — proof the bytes really come from Redis, not a re-read of origin |
| evict | `POST /evict` → Redis `EXISTS=0`; next read re-misses and repopulates with a fresh bounded TTL |
| TTL expiry | shorten the key to 1s via `redis-cli EXPIRE`; it vanishes and the next read re-misses origin, then re-stores at the full 60s policy TTL |
| live → DOWN | stop the container: `/summary` still returns origin in **~2s** (was **61s**), `stats` stays responsive with `redisUp:false`, `/actuator/health` → 503 — honest, fast, no exhausted worker pool |
| DOWN → live | RAM was genuinely lost across the stop (`EXISTS=0`); the next read re-misses into a fresh key; the service answered HTTP 200 immediately after recovery |

**Measured on 2026-11-11 (this host):** degraded `/summary` **2029ms** (bound 8000ms; **30× faster**
than the 61s pre-fix), degraded `/stats` 2037ms, health 503, `redisUp:false` throughout the outage,
and `redisUp:true` + a repopulated key after recovery. `scripts/proof-redis-resilience.mjs` **16/16**
pins the static floor beneath this (both bounded timeouts present + short, honest ping-derived
`redisUp`, read-through shape, non-default witness port, 8s budget, no env override, finally-restore),
each family with a planted arm so deleting a bound or widening a port/budget reddens the gate.

Honest limit: the live witness uses a **non-default port** because the default pair is spoken for on
this host; a compose/CI stack on a registry-healthy machine still owns the canonical 6379/5672
round-trip. The static proof reads declarations, not a socket — the measured 2s degrade belongs to
this live witness and the numbers above, not to the gate.

## M1071 — the LIVE RabbitMQ witness (lossless transport, honest `live`, bounded degrade)

Where M1070 gave the cache tier a live Redis, `verify-services.mjs` still proves only the honest
**DOWN** floor for messaging: the tier boots against a dead `:3999`, the binder reports DOWN and
`/messaging/summary` answers `live:false`. `scripts/verify-messaging-live.mjs` is the complementary
**live** witness — it starts a project-owned RabbitMQ and drives a real `messaging-service` against
it, so publish routing, delivery, the seen-set, the shard census, the DLQ sink and the outage path
are all measured against a broker that actually answered. Like the Redis witness it is not part of
`npm run proof` (it starts Docker + a jar); it is the runnable truth this section documents.

**Why it exists — three real defects, all measured.** A dead-port witness cannot see a broker that
answers, so it missed three production defects a live run exposed immediately:

1. `/messaging/summary` hardcoded `"live", false` — a working broker (actuator UP, full
   exchange/queue topology) still reported DOWN. Fixed to a **real AMQP probe**
   (`createConnection().isOpen()`, failure swallowed into `false`); the witness proves the flag
   flips **both ways** (UP→`true`, DOWN→`false`).
2. `POST /publish` 500'd **every** call: `partition-key-expression: payload.key` was evaluated after
   the JSON converter had turned the POJO payload into a `byte[]`, throwing
   `SpelEvaluationException: EL1008E`. Fixed by carrying the key in a `MessageBuilder` **header**
   (`setHeader("partitionKey", event.key())`) that survives serialization, and removing the custom
   `routing-key-expression`.
3. **7 of 8 messages silently dropped**: Rabbit's binder implements partitioning as **one queue per
   partition** and needs **one consumer instance per partition** (`instanceIndex` decides which). A
   single jar with `partition-count: 8` + `partitioned: true` consumed only `pipeline-0`, so
   `sent:8 / delivered:1`. Fixed by removing broker-level partitioning entirely.

A fourth, latent risk was closed too: an implicit **60s** AMQP connection timeout would park Tomcat
workers on a broker outage (the M1070 avalanche again), so `spring.rabbitmq.connection-timeout: 2000`
plus template receive/reply timeouts now bound it.

**The architecture decision (direction A) — and its honest trade-off.** Keep the broker topology
simple: **one shared durable group queue** (`group: footballos.pipeline`) with `concurrency: 4`
competing consumers, `prefetch: 64` as the QoS back-pressure gate, `max-attempts: 5` with
exponential back-off and `republish-to-dlq: true` into `footballos.events.dlq`. The 8-shard decision
survives as a **deterministic consumer-side census** (`PipelineFunctions.shardOf()/byShard`), the
wire twin of the pure fold in `domain/queue.ts` — so shard accounting is still real without physical
partitions. Honest trade-off: a shared queue with concurrency does **not** guarantee per-key
ordering; this pipeline is a commutative idempotent counter (the seen-set), so order carries no
meaning here.

```sh
# build once, then run the live witness from the repo root
mvn -DskipTests package -f services/pom.xml
node scripts/verify-messaging-live.mjs           # reuses/leaves the RabbitMQ container
node scripts/verify-messaging-live.mjs --clean   # removes the container at the end
```

**Port hygiene (non-negotiable on this host).** 5672/6379 belong to a foreign Docker Desktop
workload (a Career OS stack) and are **never dialed**. The script starts `footballos-rabbit-live`
bound **only** to `127.0.0.1:5673:5672` and `127.0.0.1:15673:15672` with a dedicated
`footballos/footballos` user, spawns a fresh `messaging-service` jar with **only standard**
`SPRING_RABBITMQ_HOST/PORT/USER/PASS` (no `SPRING_CLOUD_STREAM_RABBIT_BINDER_*` override — the
witness proves the standard properties genuinely redirect the binder), reuses a surviving container,
and restores it in a `finally`/SIGINT handler so a failed assertion never leaves the broker down.

**A hypothesis falsified.** Before the live run it was suspected that `SPRING_RABBITMQ_PORT` could
not reach the Spring Cloud Stream binder and that M1066's `:3999` override was misrouted. The live
experiment disproved it: setting only the standard `SPRING_RABBITMQ_*` to `127.0.0.1:5673` moved the
binder's **actual** AMQP connection to the project broker, which then declared the exchange and
queue there. The witness-integrity family now pins "standard properties only", so this cannot
silently regress into an env-crutch.

**What it asserts (18 checks, all measured against the live broker):**

| Phase | 断言 / response |
|---|---|
| boot | management API answers on the non-default **15673**; container publishes AMQP **only** at `127.0.0.1:5673` (foreign 5672/6379 never dialed) |
| live → UP | `live=true` from a real AMQP probe; actuator health **UP** (was a hardcoded `false`) |
| topology | the `footballos.events` exchange + shared group queue `footballos.pipeline` are really provisioned — no `-0` partition-only queue |
| consumers | the shared queue has **4** competing consumers (`concurrency: 4`) |
| publish | `POST /publish` → 200 `sent==requested` (was the EL1008E 500) |
| losslessness | **all** published events consumed: `delivered=8, seen=8, duplicates=0` (was `delivered:1`, 7/8 dropped) |
| shard census | the 8-shard **consumer-side** census is real (shards touched, events accounted) |
| drain | shared queue drains to 0 after the burst — no unroutable backlog |
| idempotency | re-publishing 2 known ids + 1 new id → `duplicates=2, delivered=9`, seen-set unchanged |
| DLQ sink | a message on `footballos.events.dlq` is routed **and consumed** by `deadLetter` (`deadLettered 0→1`) |
| live → DOWN | stop the container: `live=false` **honestly in ~14ms** (bound 8000ms; was a hardcoded false when UP and an implicit 60s outage), `/publish` → 200 `sent:0` in ~23ms (never a 500, never a parked worker), health → **503** agreeing with `live=false` |
| DOWN → live | `live` flips back to `true` (bidirectional), a fresh event is accepted and delivered, all 8 shards representable again |

**Measured on 2026-11-11 (this host):** broker-UP `live=true` / health UP; `delivered=8, seen=8`;
duplicate burst `duplicates=2, delivered=9`; DLQ `deadLettered 0→1`; broker-DOWN `live=false` in
**14ms**, `/publish` 200 `sent:0` in **23ms**, health 503; recovery `live=true` with a delivered
event. `scripts/proof-messaging-resilience.mjs` **16/16** pins the static floor beneath this
(six families, each with a planted arm: lossless transport, honest live probe, bounded degrade,
consumer-side shard/idempotency semantics, witness integrity, population floor) — a reintroduced
`payload.key` routing, physical partition, hardcoded `live`, or widened timeout/port reddens the
gate on any machine without Docker.

Honest limit: the live witness uses a **non-default port** because the default pair is spoken for on
this host; a compose/CI stack on a registry-healthy machine still owns the canonical 5672/15672
round-trip. The static proof reads declarations, not a socket — the measured 14ms degrade, the
8/8 delivery and the DLQ consumption belong to `verify-messaging-live.mjs` and the numbers above,
not to the gate. `PLATFORM_LIVE` stays false and the SPA still never calls the stack.

## Tear-down

```sh
# Windows (Git Bash / PowerShell): kill every java process this stack started
taskkill /IM java.exe /F
```

```sh
# Unix: find and kill the seven host-booted jars
pkill -f eureka-server-0.1.0.jar; pkill -f config-server-0.1.0.jar
pkill -f league-service-0.1.0.jar; pkill -f discipline-service-0.1.0.jar
pkill -f cache-service-0.1.0.jar; pkill -f messaging-service-0.1.0.jar
pkill -f gateway-0.1.0.jar
```

## Continuous integration

`.github/workflows/spring-cloud-stack.yml` is the registry-healthy mirror of this runbook:
on every push or pull request touching the service side it (1) builds the Maven reactor on
ubuntu-latest with a cached Temurin JDK, (2) boots all seven services and round-trips the broker-deprived
tiers through the gateway with `node scripts/verify-services.mjs` — the same checklist this file
walks by hand —
(3) builds the web app and runs the full proof suite, and (4) installs Playwright chromium
and runs the browser floor (`npx playwright test`). It is deliberately NOT executed by
this author's local machine (no Actions access here); it is the same steps, aimed at a
registry GitHub runners can reach. If it goes red, the failing step is the truth about
that commit.

`.github/workflows/spring-cloud-matrix.yml` is the same family with a narrower promise: a
fail-fast-off matrix over ubuntu-latest and windows-latest (Temurin 21) builds the reactor
on both OSs, then an ubuntu-latest job boots all seven services and runs the same
`verify-services.mjs` checklist — service-side breakage that is OS-specific shows up on
whichever OS it chokes on. It exercises the registry-to-artifact path CI runners legitimately
provide; it does not, and cannot, prove anything about this author's impaired Docker Desktop.

## Honesty boundaries — what this stack is NOT

- The web build (`npm run dev`, `npm run build`, the E2E suite) never boots these services
  and never calls them. The platform atlas says so on the screen and `proof-services.mjs`
  reddens the gate if any `localhost:87xx`/`localhost:8888`/`localhost:8081` appears inside
  the app.
- The league service serves frozen exports of this world — the counts + digest contract and
  the fifteen standard tables (`league-tables.json`) — never the live seed and never a
  hand-written payload. Refresh the exports with `node scripts/export-service-contract.mjs`
  and commit both JSON files. The two dedicated routes (`/league/summary` and
  `/league/table/**`) read two dedicated frozen files; neither route reaches beyond them.
- `PLATFORM_LIVE` in `domain/platform.ts` is false and stays false until something in the SPA
  is entitled to call the gateway.
- The actuator surface on all seven services is exactly `health,info`. Do not widen it "for
  debugging" — if a number is needed, export it into the contract, do not expose the endpoint.
- The host verifier does **not** claim Redis or RabbitMQ is running, and does not dial the brokers that
  are on this host. Another Docker Desktop workload publishes this machine's 6379 and 5672 and refuses
  default credentials, so `verify-services.mjs` spawns the cache and messaging tiers against :3999 (a
  dead port) and asserts the degraded-but-honest responses: the contract from origin with
  `redisUp:false`, the messaging observe surface with `live:false`, the binder's health reporting DOWN.
  A live broker round-trip belongs to the compose stack on a registry-healthy machine, or to a host
  whose 6379/5672 belong to this reactor — delete the two spawn-time overrides in `BOOT_ENV` when that
  is the case. `PLATFORM_LIVE` stays false whether or not a broker is up.
- The **one** broker this host does run is the M1070 live Redis witness: `verify-redis-live.mjs` starts
  `footballos-redis-live` on `127.0.0.1:16379` (a project-owned non-default port, never the foreign
  6379), points a real cache-service at it, and measures read-through/evict/TTL plus a bounded live→down
  degrade (~2s, down from Lettuce's 61s default) and recovery. That container is a test fixture, not
  the reactor's canonical broker; the default-port story remains compose/CI's. `proof-redis-resilience.mjs`
  pins the static floor (bounded timeouts, honest `redisUp`, non-default witness port, 8s degrade budget).
  Delete a timeout bound or point the witness at 6379 and the gate goes red.

## Relationship to the gate

`scripts/proof-services.mjs` reads all seven ymls, the poms, the compose file, the
FallbackRouter and the descriptor, and refuses divergence between them; `scripts/proof-boot-order.mjs`
reads the same dependency edges and proves the verifier's boot order is a valid topological order.
Neither runs the stack; `scripts/verify-services.mjs` is the runnable witness for the behavior this
file describes. If you change a port, a name, a dependency edge, the breaker's name/fallback, or a
controller's mapping, change **all** of: the yml, the poms, `domain/platform.ts`, the screen, the
proofs, this runbook, and the verifier's `TOPOLOGY`/`BOOT_IDS` — or the gate goes red. That is the
contract.
