FROM eclipse-temurin:21-jdk AS build
WORKDIR /build
COPY .mvn .mvn
COPY mvnw pom.xml ./
RUN chmod +x mvnw
COPY src src
RUN ./mvnw --batch-mode -DskipTests package

FROM eclipse-temurin:21-jre
WORKDIR /app
RUN groupadd --system spotme && useradd --system --gid spotme spotme
COPY --from=build --chown=spotme:spotme /build/target/backend-0.0.1-SNAPSHOT.jar app.jar
USER spotme
ENV SERVER_ADDRESS=0.0.0.0
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
