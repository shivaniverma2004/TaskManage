package com.shivani.taskmanager.config;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;
import org.springframework.util.StringUtils;

/**
 * Railway / Postgres plugins usually expose {@code DATABASE_URL} or {@code PGHOST}
 * rather than {@code JDBC_DATABASE_URL}. Maps those into standard {@code spring.datasource.*}
 * before Spring Boot binds the DataSource.
 */
@Order(Ordered.HIGHEST_PRECEDENCE)
public class RailwayDatasourceEnvironmentPostProcessor implements EnvironmentPostProcessor {

    private static final String SOURCE_NAME = "railwayDatasource";

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        if (environment.getPropertySources().contains(SOURCE_NAME)) {
            return;
        }
        if (StringUtils.hasText(environment.getProperty("JDBC_DATABASE_URL"))) {
            return;
        }

        Map<String, Object> props = new LinkedHashMap<>();

        String databaseUrl = environment.getProperty("DATABASE_URL");
        if (StringUtils.hasText(databaseUrl)) {
            String resolvedDbUrl = databaseUrl.trim();
            ParsedJdbc parsed = parseDatabaseUrl(resolvedDbUrl);
            props.put("spring.datasource.url", parsed.jdbcUrl());
            props.put("spring.datasource.username", parsed.username());
            props.put("spring.datasource.password", parsed.password());
            props.put("spring.datasource.driver-class-name", "org.postgresql.Driver");
            props.put("spring.h2.console.enabled", "false");
            environment.getPropertySources().addFirst(new MapPropertySource(SOURCE_NAME, props));
            return;
        }

        String pgHost = environment.getProperty("PGHOST");
        if (StringUtils.hasText(pgHost)) {
            String port = StringUtils.hasText(environment.getProperty("PGPORT"))
                ? environment.getProperty("PGPORT")
                : "5432";
            String database = environment.getProperty("PGDATABASE");
            if (!StringUtils.hasText(database)) {
                database = "postgres";
            }
            String jdbcUrl = "jdbc:postgresql://" + pgHost + ":" + port + "/" + database;
            String sslMode = environment.getProperty("PGSSLMODE");
            if (StringUtils.hasText(sslMode)) {
                String ssl = sslMode.trim();
                jdbcUrl += "?sslmode=" + urlEncodeQueryValue(ssl);
            }
            props.put("spring.datasource.url", jdbcUrl);
            props.put(
                "spring.datasource.username",
                StringUtils.hasText(environment.getProperty("PGUSER")) ? environment.getProperty("PGUSER") : "postgres"
            );
            props.put("spring.datasource.password", environment.getProperty("PGPASSWORD", ""));
            props.put("spring.datasource.driver-class-name", "org.postgresql.Driver");
            props.put("spring.h2.console.enabled", "false");
            environment.getPropertySources().addFirst(new MapPropertySource(SOURCE_NAME, props));
        }
    }

    private static String urlEncodeQueryValue(String value) {
        return value.replace(" ", "+").replace("&", "%26");
    }

    static ParsedJdbc parseDatabaseUrl(String databaseUrl) {
        URI uri = URI.create(databaseUrl);
        String scheme = uri.getScheme();
        if (!"postgres".equals(scheme) && !"postgresql".equals(scheme)) {
            throw new IllegalArgumentException("DATABASE_URL must use postgres or postgresql scheme");
        }
        String username = "postgres";
        String password = "";
        String userInfo = uri.getRawUserInfo();
        if (StringUtils.hasText(userInfo)) {
            int colon = userInfo.indexOf(':');
            if (colon >= 0) {
                username = decode(userInfo.substring(0, colon));
                password = decode(userInfo.substring(colon + 1));
            } else {
                username = decode(userInfo);
            }
        }
        String host = uri.getHost();
        if (host == null || host.isBlank()) {
            throw new IllegalArgumentException("DATABASE_URL is missing host");
        }
        int port = uri.getPort() > 0 ? uri.getPort() : 5432;
        String path = uri.getPath();
        String dbName = "postgres";
        if (path != null && path.length() > 1) {
            dbName = path.substring(1);
        }
        String jdbcUrl = "jdbc:postgresql://" + host + ":" + port + "/" + dbName;
        String query = uri.getRawQuery();
        if (StringUtils.hasText(query)) {
            jdbcUrl += "?" + query;
        }
        return new ParsedJdbc(jdbcUrl, username, password);
    }

    private static String decode(String part) {
        return URLDecoder.decode(part, StandardCharsets.UTF_8);
    }

    record ParsedJdbc(String jdbcUrl, String username, String password) {}
}
