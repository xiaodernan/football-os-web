# Multi-module build: the context is the reactor root (services/), so the parent pom and every
# sibling module are visible. -pl selects this module, -am (also-make) builds its reactor
# dependencies first. Mirrors the other service Dockerfiles so proof-services.mjs can read one shape.
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /workspace
COPY pom.xml .
COPY eureka-server/pom.xml eureka-server/pom.xml
COPY config-server/pom.xml config-server/pom.xml
COPY gateway/pom.xml gateway/pom.xml
COPY league-service/pom.xml league-service/pom.xml
COPY discipline-service/pom.xml discipline-service/pom.xml
COPY cache-service/pom.xml cache-service/pom.xml
RUN mvn -q -DskipTests dependency:go-offline || true
COPY eureka-server eureka-server
COPY config-server config-server
COPY gateway gateway
COPY league-service league-service
COPY discipline-service discipline-service
COPY cache-service cache-service
RUN mvn -q -DskipTests package -pl cache-service -am

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /workspace/cache-service/target/cache-service-0.1.0.jar app.jar
EXPOSE 8083
ENTRYPOINT ["java", "-jar", "app.jar"]
