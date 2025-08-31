FROM maven:3.8.5-openjdk-11 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean install -DskipTests

FROM tomcat:9.0-jdk11-openjdk
EXPOSE 8080
COPY --from=build /app/target/CatalogService-1.0-SNAPSHOT.war /usr/local/tomcat/webapps/CatalogService.war
CMD ["catalina.sh", "run"]
