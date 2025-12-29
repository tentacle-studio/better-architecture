#include <curl/curl.h>
#include <string>
#include <stdexcept>
#include <nlohmann/json.hpp>

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

public:
    // Now accepts hostPort and internalPort
    // internalPort: 80 for Nginx, 6379 for Redis, 5432 for Postgres
    std::string createContainer(std::string imageName, int internalPort, int hostPort) {
        
        json j;
        j["Image"] = imageName;
        
        // The Key must be "80/tcp" or "5432/tcp"
        std::string portKey = std::to_string(internalPort) + "/tcp";
        
        // The Value is an Array of Objects, and HostPort is a STRING
        j["HostConfig"]["PortBindings"][portKey] = json::array({
            { {"HostPort", std::to_string(hostPort)} }
        });

        // Basic Resource Limits (Optional, for game balance)
        j["HostConfig"]["NanoCpus"] = 500000000; // 0.5 CPU
        j["HostConfig"]["Memory"] = 256 * 1024 * 1024; // 256MB RAM

        // Call the API
        std::string res = sendRequest("POST", "/containers/create", j.dump());
        
        try {
            auto resJson = json::parse(res);
            return resJson["Id"];
        } catch (...) {
            return ""; // Error handling
        }
    }

    void startContainer(std::string containerId) {
        sendRequest("POST", "/containers/" + containerId + "/start");
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
