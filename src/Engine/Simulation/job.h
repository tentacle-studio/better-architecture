#pragma once
#include "Map/Grid/tile_enums.h"
#include <string>

enum class JobType {
    BUILD_CONTAINER,    // User placed a tower
    DESTROY_CONTAINER,  // User sold a tower
    PROCESS_REQUEST,    // A packet hit a server
    CALCULATE_PATH      // Wiring logic check
};

struct SimJob {
    JobType type;
    std::string entityId;      // UUID of the packet (for PROCESS_REQUEST) or service (for BUILD/DESTROY)
    std::string targetId;      // Target service ID (for PROCESS_REQUEST jobs)
    std::string metaData;      // JSON payload (e.g. image name, target URL)
    GridIndex gridPos;         // Location context
};

struct SimResult {
    std::string entityId;
    bool success;
    double durationMs;    // For showing latency numbers
    std::string errorMsg;
    float cpuLoad;        // For updating tower color (red = hot)
    int statusCode;       // HTTP status code for requests 
};