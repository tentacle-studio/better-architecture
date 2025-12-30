#pragma once
#include <vector>
#include <queue>
#include <thread>
#include <mutex>
#include <condition_variable>
#include <functional>
#include <atomic>

class ThreadPool {
private:
    // The Workers
    std::vector<std::thread> workers;
    
    // The Task Queue
    std::queue<std::function<void()>> tasks;
    
    // Synchronization
    std::mutex queue_mutex;
    std::condition_variable condition;
    
    // Shutdown flag
    std::atomic<bool> stop;

public:
    // Constructor: Launch 'numThreads' workers
    ThreadPool(size_t numThreads) : stop(false) {
        for(size_t i = 0; i < numThreads; ++i) {
            workers.emplace_back([this] {
                while(true) {
                    std::function<void()> task;

                    {
                        // 1. Lock and Wait
                        std::unique_lock<std::mutex> lock(this->queue_mutex);
                        
                        // Wait until stop is true OR queue is not empty
                        this->condition.wait(lock, [this]{ 
                            return this->stop || !this->tasks.empty(); 
                        });

                        // 2. Check for shutdown
                        if(this->stop && this->tasks.empty())
                            return;

                        // 3. Get the task
                        task = std::move(this->tasks.front());
                        this->tasks.pop();
                    }

                    // 4. Execute (Outside lock!)
                    task();
                }
            });
        }
    }

    // Destructor: Clean up
    ~ThreadPool() {
        {
            std::unique_lock<std::mutex> lock(queue_mutex);
            stop = true;
        }
        condition.notify_all(); // Wake up all threads to let them exit
        
        for(std::thread &worker : workers) {
            if(worker.joinable())
                worker.join();
        }
    }

    // Add a new task to the pool
    void enqueue(std::function<void()> task) {
        {
            std::unique_lock<std::mutex> lock(queue_mutex);
            // Don't allow enqueueing after stopping
            if(stop) throw std::runtime_error("enqueue on stopped ThreadPool");
            tasks.emplace(task);
        }
        condition.notify_one(); // Wake up one worker
    }
};