#include "thread_pool.hpp"
#include <chrono>
#include <string>
#include <iostream>

// Include your Docker/HTTP client here (e.g., cpr or raw libcurl)
// For this example, we mock the HTTP call.

struct RequestResult {
    bool success;
    int statusCode;
    double latencyMs;
    std::string responseBody;
};

class RequestExecutor {
private:
    ThreadPool pool;

public:
    // Initialize with e.g., 8 concurrent connections allowed
    RequestExecutor(size_t maxConcurrency = 8) : pool(maxConcurrency) {}

    // The method called by SimulationManager
    // 'callback' is what runs when the request is FINISHED
    void executeRequest(std::string url, std::function<void(RequestResult)> callback) {
        
        // Enqueue a lambda into the thread pool
        pool.enqueue([this, url, callback]() {
            RequestResult result;
            
            // 1. Start Timer
            auto start = std::chrono::high_resolution_clock::now();

            // 2. Perform Blocking I/O (The slow part)
            // In reality: result = MyHttpClient::get(url);
            performCurlRequest(url);

            // --- SIMULATION OF NETWORK I/O ---
            std::this_thread::sleep_for(std::chrono::milliseconds(100)); // Fake 100ms latency
            bool isSuccess = true; 
            // ---------------------------------

            // 3. Stop Timer
            auto end = std::chrono::high_resolution_clock::now();
            std::chrono::duration<double, std::milli> duration = end - start;

            result.success = isSuccess;
            result.statusCode = 200;
            result.latencyMs = duration.count();

            // 4. Run Callback
            // NOTE: This callback runs on the WORKER thread. 
            // Be careful not to touch SFML (Graphics) here directly.
            callback(result);
        });
    }

    // Helper function using libcurl
    // Returns pair<int statusCode, double latencyMs>
    std::pair<int, double> performCurlRequest(std::string url) {
        CURL* curl;
        CURLcode res;
        long http_code = 0;
        
        curl = curl_easy_init();
        if(curl) {
            curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
            
            // Set a timeout so the game handles "Packet Loss" simulation
            curl_easy_setopt(curl, CURLOPT_TIMEOUT_MS, 2000L); 
            
            // Don't clutter stdout
            curl_easy_setopt(curl, CURLOPT_NOBODY, 1L); // HEAD request only (faster for sim)
            // OR use CURLOPT_WRITEFUNCTION to swallow output if you need GET body

            res = curl_easy_perform(curl);
            
            if(res == CURLE_OK) {
                curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &http_code);
            } else {
                // Curl failed (e.g. Connection Refused -> Container Down)
                http_code = 503; 
            }
            
            curl_easy_cleanup(curl);
        }
        
        return { (int)http_code, 0.0 }; // Latency is calculated by wrapper
    }
};