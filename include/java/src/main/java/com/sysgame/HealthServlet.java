package com.sysgame;

import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;

/**
 * Simple health check endpoint for monitoring container status
 * Responds to GET requests at the root path "/" with 200 OK
 */
@WebServlet(name = "HealthServlet", urlPatterns = {"/"})
public class HealthServlet extends HttpServlet {

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        resp.setStatus(200);
        resp.setContentType("text/plain");
        resp.getWriter().println("OK");
    }
    
    @Override
    protected void doHead(HttpServletRequest req, HttpServletResponse resp) {
        // Support HEAD requests for health checks
        resp.setStatus(200);
    }
}
