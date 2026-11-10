# The platform runbook — how to boot and verify the Spring Cloud stack

> M1042: this file is the operator's half of what `scripts/verify-services.mjs` automates.
> The SPA never calls these services; the runbook is for a human who wants to watch the stack
> behave, not for the web build. Nothing here is started by `npm run dev`, `npm run build` or
> any screen. PLATFORM_LIVE stays false by design and this file changes nothing about that.

## What the stack is

| Module | artifactId | Port | Registers with Eureka | Serves |
|---|---|---|---|---|
| `services/eureka-server` | `eureka-server` | **8761** | no — the registry never registers itself | the registry |
| `services/config-server` | `config-server` | **8888** | yes | a native classpath repository (`config-repo/application.yml`) |
| `services/league-service` | `league-service` | **8081** | yes | `GET /league/summary` — the frozen counts contract; `GET /league/table(/{comp})` — the frozen tables |
| `services/gateway` | `gateway` | **8087** | yes | the edge: `/api/league/**` → `lb://LEAGUE-SERVICE` |
| `services/discipline-service` | `discipline-service` | **8082** | yes | `GET /discipline/clock(/{comp})` — the frozen card clocks |

The gateway cannot live on 8080 on this machine — `com.docker.backend.exe` (Docker Desktop)
binds that port (PID 19388 observed). Everything else is stock.

## Build

```sh
mvn -DskipTests package -f services/pom.xml
```

Four fat jars land in `services/*/target/` (roughly 47–58 MB each). The Dockerfiles in each
module build the same reactor from the same poms (`docker build -f services/<module>/Dockerfile services/`),
and `services/docker-compose.yml` wires the same four services with the same ports in
dependency order — with the environment overrides below, which are mandatory inside containers
(localhost would point each service at itself):

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
> Dockerfiles as correct-by-construction (all four poms copied, `-pl <module> -am`, one entrypoint)
> and exercise the stack with `node scripts/verify-services.mjs`, which boots the four jars on the
> host and is the runnable truth for this environment. If a registry-healthy machine is available,
> `docker compose -f services/docker-compose.yml up --build` is the one-command equivalent.

## Boot by hand (dependency order)

```sh
java -jar services/eureka-server/target/eureka-server-0.1.0.jar    # wait ~15s
java -jar services/config-server/target/config-server-0.1.0.jar    # wait ~8s
java -jar services/league-service/target/league-service-0.1.0.jar  # wait ~10s
java -jar services/gateway/target/gateway-0.1.0.jar                 # wait ~8s
```

Or run the whole verification in one command, which is what the runbook recommends:

```sh
node scripts/verify-services.mjs
```

`verify-services.mjs` checks the jars exist, boots all four, and then walks the checklist
below automatically.

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

## Tear-down

```sh
# Windows (Git Bash / PowerShell): kill every java process this stack started
taskkill /IM java.exe /F
```

```sh
# Unix: find and kill the four jars
pkill -f eureka-server-0.1.0.jar; pkill -f config-server-0.1.0.jar
pkill -f league-service-0.1.0.jar; pkill -f gateway-0.1.0.jar
```

## Continuous integration

`.github/workflows/spring-cloud-stack.yml` is the registry-healthy mirror of this runbook:
on every push or pull request touching the service side it (1) builds the Maven reactor on
ubuntu-latest with a cached Temurin JDK, (2) boots all four services with
`node scripts/verify-services.mjs` — the same checklist this file walks by hand —
(3) builds the web app and runs the full proof suite, and (4) installs Playwright chromium
and runs the browser floor (`npx playwright test`). It is deliberately NOT executed by
this author's local machine (no Actions access here); it is the same steps, aimed at a
registry GitHub runners can reach. If it goes red, the failing step is the truth about
that commit.

`.github/workflows/spring-cloud-matrix.yml` is the same family with a narrower promise: a
fail-fast-off matrix over ubuntu-latest and windows-latest (Temurin 21) builds the reactor
on both OSs, then an ubuntu-latest job boots all four services and runs the same
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
- The actuator surface on all four services is exactly `health,info`. Do not widen it "for
  debugging" — if a number is needed, export it into the contract, do not expose the endpoint.

## Relationship to the gate

`scripts/proof-services.mjs` reads the same four ymls, the poms, the compose file, the
FallbackRouter and the descriptor, and refuses divergence between them. It does not run the
stack; `scripts/verify-services.mjs` is the runnable witness for the behavior this file
describes. If you change a port, a name, the breaker's name/fallback, or the controller's
mapping, change **all** of: the yml, the poms, `domain/platform.ts`, the screen, the proofs,
this runbook — or the gate goes red. That is the contract.
