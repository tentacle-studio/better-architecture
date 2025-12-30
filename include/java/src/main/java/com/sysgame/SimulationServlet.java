package com.sysgame;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;

import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;

// Map to root context path "/"
@WebServlet(name = "SimulationServlet", urlPatterns = {"/simulate"})
public class SimulationServlet extends HttpServlet {

    private HikariDataSource dataSource;
    private boolean dbConfigured = false;

    @Override
    public void init() {
        System.out.println("Initializing Simulation Harness...");

        // 1. Read Environment Variables injected by C++
        String dbUrl = System.getenv("DB_URL");   // e.g., jdbc:postgresql://172.17.0.2:5432/postgres
        String dbUser = System.getenv("DB_USER"); // e.g., postgres
        String dbPass = System.getenv("DB_PASS"); // e.g., secret
        
        // Configurable Pool Size (Default to 5 to make it easy to crash!)
        String poolSizeStr = System.getenv("DB_POOL_SIZE");
        int poolSize = (poolSizeStr != null) ? Integer.parseInt(poolSizeStr) : 5;

        if (dbUrl != null && !dbUrl.isEmpty()) {
            try {
                HikariConfig config = new HikariConfig();
                config.setJdbcUrl(dbUrl);
                config.setUsername(dbUser);
                config.setPassword(dbPass);
                
                // CRITICAL LESSON: Connection Timeout
                // If pool is full, wait 2000ms then throw error
                config.setConnectionTimeout(2000); 
                config.setMaximumPoolSize(poolSize);
                
                dataSource = new HikariDataSource(config);
                dbConfigured = true;
                System.out.println("DB Connected: " + dbUrl + " with Pool Size: " + poolSize);
            } catch (Exception e) {
                System.err.println("Failed to connect to DB: " + e.getMessage());
            }
        } else {
            System.out.println("No DB_URL found. Running in Stateless Mode (CPU only).");
        }
    }

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        String action = req.getParameter("action");
        if (action == null) action = "cpu";

        long startTime = System.currentTimeMillis();

        try {
            if ("db".equals(action)) {
                handleDbRequest();
                resp.getWriter().write("DB_OK");
            } else {
                handleCpuRequest();
                resp.getWriter().write("CPU_OK");
            }
            
            resp.setStatus(200);

        } catch (SQLException e) {
            // This happens when Connection Pool is exhausted!
            resp.setStatus(503); // Service Unavailable
            resp.getWriter().write("DB_POOL_EXHAUSTED");
            System.err.println("Error: " + e.getMessage());
            
        } catch (InterruptedException e) {
            resp.setStatus(500);
        }

        // Add header so C++ can read precise processing time if needed
        long duration = System.currentTimeMillis() - startTime;
        resp.setHeader("X-Sim-Duration", String.valueOf(duration));
    }

    private void handleCpuRequest() throws InterruptedException {
        // Simulate Calculation (Matrix Multiplication or Hashing)
        // Just sleep for 50ms for now
        Thread.sleep(50); 
    }

    private void handleDbRequest() throws SQLException {
        if (!dbConfigured) {
            throw new SQLException("Database not configured! Connect a wire to a DB tower.");
        }

        // Grab a connection from the pool
        // This line BLOCKS if the pool is empty!
        try (Connection conn = dataSource.getConnection()) {
            
            // Simulate a query that takes time
            // "SELECT pg_sleep(0.05)" forces Postgres to wait 50ms
            try (PreparedStatement stmt = conn.prepareStatement("SELECT pg_sleep(0.05)")) {
                stmt.execute();
            }
        }
    }

    @Override
    public void destroy() {
        if (dataSource != null) {
            dataSource.close();
        }
    }
}