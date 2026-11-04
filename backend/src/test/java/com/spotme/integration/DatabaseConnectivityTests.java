package com.spotme.integration;

import java.sql.Connection;
import java.sql.SQLException;

import javax.sql.DataSource;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;


/**
 * Verifies that the app can reach the Supabase Postgres database.
 *
 * Requires the SUPABASE_DB_PASSWORD environment variable to be set
 * (the same one referenced in application.yml).
 */
@SpringBootTest
@org.springframework.test.context.ActiveProfiles("postgres")
@org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable(named = "RUN_POSTGRES_TESTS", matches = "true")
class DatabaseConnectivityTests {

    @Autowired
    private DataSource dataSource;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void dataSourceIsConfigured() {
        assertNotNull(dataSource, "DataSource bean should be created");
    }

    @Test
    void canOpenConnection() throws SQLException {
        try (Connection connection = dataSource.getConnection()) {
            assertNotNull(connection);
            assertFalse(connection.isClosed(), "Connection should be open");
            assertTrue(connection.isValid(5), "Connection should be valid within 5 seconds");
        }
    }

    @Test
    void canRunSimpleQuery() {
        Integer result = jdbcTemplate.queryForObject("SELECT 1", Integer.class);
        assertEquals(1, result);
    }
}