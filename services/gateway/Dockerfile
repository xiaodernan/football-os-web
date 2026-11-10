# Built from the services/ directory (see docker-compose.yml): the reactor parent and the
# sibling module poms must be in the build context for Maven to resolve this module.
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /src
COPY pom.xml ./
COPY eureka-server/pom.xml eureka-server/
COPY config-server/pom.xml config-server/
COPY gateway/pom.xml gateway/
COPY league-service/pom.xml league-service/
RUN mvn -q -DskipTests -pl gateway -am package

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /src/gateway/target/*.jar /app/app.jar
EXPOSE 8087
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
