#include <curl/curl.h>
#include <string>
#include <stdexcept>
#include <nlohmann/json.hpp>
#include <iostream>
#include <sstream>
#include <iomanip>
#include <vector>
#include <utility>
#include <algorithm>

using json = nlohmann::json;

class DockerClient {
private:
    CURL* curl;
    const std::string SOCKET_PATH = "/Users/jimmynguyen/.rd/docker.sock";

    // Helper to send raw HTTP over Unix Socket
    std::string sendRequest(std::string method, std::string endpoint, std::string payload = "") {
        std::string response_string;
        curl = curl_easy_init();
        if(curl) {
            // CRITICAL: Tell curl to use the Unix Socket, not TCP
            curl_easy_setopt(curl, CURLOPT_UNIX_SOCKET_PATH, SOCKET_PATH.c_str());
            
            // Construct URL (localhost is ignored but required syntax)
            std::string url = "http://localhost/v1.41" + endpoint;
            curl_easy_setopt(curl, CURLOPT_URL, url.c_str());

            // Set Content-Type header for JSON payloads
            struct curl_slist* headers = nullptr;
            if (!payload.empty()) {
                headers = curl_slist_append(headers, "Content-Type: application/json");
                curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
            }

            if (method == "POST") {
                if (!payload.empty()) {
                    curl_easy_setopt(curl, CURLOPT_POST, 1L);
                    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, payload.c_str());
                } else {
                    // POST without body - use CUSTOMREQUEST to avoid sending Content-Length
                    curl_easy_setopt(curl, CURLOPT_CUSTOMREQUEST, "POST");
                }
            } else if (method == "DELETE") {
                curl_easy_setopt(curl, CURLOPT_CUSTOMREQUEST, "DELETE");
            }

            // Callback to capture response
            curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteCallback);
            curl_easy_setopt(curl, CURLOPT_WRITEDATA, &response_string);

            CURLcode res = curl_easy_perform(curl);
            if(res != CURLE_OK) {
                std::string error = "cURL error: " + std::string(curl_easy_strerror(res));
                curl_easy_cleanup(curl);
                throw std::runtime_error(error);
            }
            
            long http_code = 0;
            curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &http_code);
            
            if (headers) {
                curl_slist_free_all(headers);
            }
            curl_easy_cleanup(curl);
            
            if (http_code >= 400) {
                throw std::runtime_error("Docker API error (HTTP " + std::to_string(http_code) + "): " + response_string);
            }
        }
        return response_string;
    }
    
    // Static callback for libcurl
    static size_t WriteCallback(void* contents, size_t size, size_t nmemb, std::string* userp) {
        userp->append((char*)contents, size * nmemb);
        return size * nmemb;
    }

    // Check if image exists locally
    bool imageExists(const std::string& imageName) {
        try {
            // URL encode the image name (replace : with %3A for tags)
            std::string encodedImage = urlEncode(imageName);
            std::string res = sendRequest("GET", "/images/" + encodedImage + "/json");
            return !res.empty();
        } catch (const std::exception& e) {
            std::cout << "[Docker] Image check failed for " << imageName 
                     << ": " << e.what() << std::endl;
            return false;
        }
    }

    // Pull image if not present
    void pullImageIfNeeded(const std::string& imageName) {
        if (!imageExists(imageName)) {
            std::cout << "[Docker] Pulling image: " << imageName << "..." << std::endl;
            
            try {
                // Parse image name into repository and tag
                std::string repo = imageName;
                std::string tag = "latest";
                
                size_t colonPos = imageName.find(':');
                if (colonPos != std::string::npos) {
                    repo = imageName.substr(0, colonPos);
                    tag = imageName.substr(colonPos + 1);
                }
                
                // Docker pull endpoint requires fromImage and tag as separate params
                std::string endpoint = "/images/create?fromImage=" + urlEncode(repo) + 
                                      "&tag=" + urlEncode(tag);
                
                // This is a streaming endpoint - we wait for completion
                std::string response = sendRequest("POST", endpoint);
                
                // Verify the pull succeeded
                if (!imageExists(imageName)) {
                    throw std::runtime_error("Image pull completed but image not found locally");
                }
                
                std::cout << "[Docker] Image pulled successfully: " << imageName << std::endl;
            } catch (const std::exception& e) {
                std::cout << "[Docker] Failed to pull image " << imageName 
                         << ": " << e.what() << std::endl;
                throw;
            }
        } else {
            std::cout << "[Docker] Image already exists: " << imageName << std::endl;
        }
    }
    
    // URL encode helper for image names with special characters
    std::string urlEncode(const std::string& value) {
        std::ostringstream escaped;
        escaped.fill('0');
        escaped << std::hex;

        for (char c : value) {
            // Keep alphanumeric and safe characters
            if (isalnum(c) || c == '-' || c == '_' || c == '.' || c == '~' || c == '/') {
                escaped << c;
            } else {
                escaped << '%' << std::setw(2) << int((unsigned char)c);
            }
        }

        return escaped.str();
    }

public:
    // Now accepts hostPort and internalPort
    // internalPort: 80 for Nginx, 6379 for Redis, 5432 for Postgres
    std::string createContainer(const std::string& imageName, int internalPort, int hostPort, 
                               const std::vector<std::pair<std::string, std::string>>& mounts = {}) {
        try {
            // Docker requires lowercase image names
            std::string lowerImageName = imageName;
            std::transform(lowerImageName.begin(), lowerImageName.end(), lowerImageName.begin(),
                          [](unsigned char c){ return std::tolower(c); });
            
            // Pull image if not already present
            pullImageIfNeeded(lowerImageName);

            json j;
            j["Image"] = lowerImageName;
            
            // The Key must be "80/tcp" or "5432/tcp"
            std::string portKey = std::to_string(internalPort) + "/tcp";
            
            // Expose the port in container config
            j["ExposedPorts"][portKey] = json::object();
            
            // The Value is an Array of Objects, and HostPort is a STRING
            j["HostConfig"]["PortBindings"][portKey] = json::array({
                { {"HostPort", std::to_string(hostPort)} }
            });
            
            // Add bind mounts if provided
            if (!mounts.empty()) {
                json binds = json::array();
                for (const auto& [hostPath, containerPath] : mounts) {
                    binds.push_back(hostPath + ":" + containerPath);
                }
                j["HostConfig"]["Binds"] = binds;
            }

            // Basic Resource Limits (Optional, for game balance)
            j["HostConfig"]["NanoCpus"] = 500000000; // 0.5 CPU
            j["HostConfig"]["Memory"] = 256 * 1024 * 1024; // 256MB RAM

            // Call the API
            std::cout << "[Docker] Creating container with image: " << lowerImageName << std::endl;
            std::string res = sendRequest("POST", "/containers/create", j.dump());
            
            auto resJson = json::parse(res);
            std::string containerId = resJson["Id"];
            
            std::cout << "[Docker] Container created: " << containerId.substr(0, 12) << std::endl;
            
            return containerId;
        } catch (const std::exception& e) {
            std::cout << "[Docker] Failed to create container: " << e.what() << std::endl;
            throw;
        }
    }

    void startContainer(const std::string& containerId) {
        try {
            std::cout << "[Docker] Starting container: " << containerId.substr(0, 12) << std::endl;
            sendRequest("POST", "/containers/" + containerId + "/start");
            std::cout << "[Docker] Container started successfully" << std::endl;
        } catch (const std::exception& e) {
            std::cout << "[Docker] Failed to start container: " << e.what() << std::endl;
            throw;
        }
    }
    
    void stopContainer(std::string containerId) {
        sendRequest("POST", "/containers/" + containerId + "/stop");
    }
    
    void removeContainer(std::string containerId) {
        sendRequest("DELETE", "/containers/" + containerId);
    }
    
    void stopAndRemove(std::string containerId) {
        try {
            stopContainer(containerId);
        } catch (...) {
            // Container might already be stopped, continue to remove
        }
        removeContainer(containerId);
    }
    
    // Get CPU/RAM usage to make tower glow red
    float getContainerCpuUsage(std::string containerId) {
        std::string res = sendRequest("GET", "/containers/" + containerId + "/stats?stream=false");
        // ... Logic to parse complex Docker stats JSON ...
        return 0.5f; // Placeholder
    }
};
