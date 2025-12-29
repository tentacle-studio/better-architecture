#pragma once
#include <queue>
#include <set>
#include <stdexcept>
#include <sys/socket.h> // Linux/Mac headers
#include <netinet/in.h>
#include <unistd.h>

class PortManager {
private:
    std::queue<int> freePorts;
    std::set<int> usedPorts;
    const int START_PORT = 30000;
    const int MAX_PORTS = 1000;

    // Helper: actually check if the OS allows binding to this port
    bool isPortAvailable(int port) {
        int sock = socket(AF_INET, SOCK_STREAM, 0);
        if (sock < 0) return false;

        struct sockaddr_in addr;
        addr.sin_family = AF_INET;
        addr.sin_addr.s_addr = INADDR_ANY;
        addr.sin_port = htons(port);

        // Try to bind. If -1, the port is taken by another app.
        bool available = (bind(sock, (struct sockaddr*)&addr, sizeof(addr)) == 0);
        
        close(sock);
        return available;
    }

public:
    PortManager() {
        // Initialize the pool
        for (int i = 0; i < MAX_PORTS; ++i) {
            freePorts.push(START_PORT + i);
        }
    }

    // Get a free port
    int acquirePort() {
        int port = -1;
        
        // Loop until we find a port that is logically free AND physically free
        while (!freePorts.empty()) {
            int candidate = freePorts.front();
            freePorts.pop();

            if (isPortAvailable(candidate)) {
                port = candidate;
                break;
            }
            // If physically taken, drop it and try next
        }

        if (port == -1) {
            throw std::runtime_error("No free ports available in range!");
        }

        usedPorts.insert(port);
        return port;
    }

    // Return port to pool (when user sells a tower)
    void releasePort(int port) {
        if (usedPorts.find(port) != usedPorts.end()) {
            usedPorts.erase(port);
            freePorts.push(port); // Recycle
        }
    }
};