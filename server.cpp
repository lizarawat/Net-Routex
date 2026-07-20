#ifndef _WIN32_WINNT
#define _WIN32_WINNT 0x0A00
#endif
#include "httplib.h"
#include "nlohmann/json.hpp"
#include <iostream>
#include <vector>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <queue>
#include <algorithm>
#include <chrono>

using json = nlohmann::json;
using namespace std;

// Graph structure definitions
struct Edge {
    string to;
    double weight;
};

using AdjList = unordered_map<string, vector<Edge>>;

// Helper: Build adjacency list
AdjList buildAdjacencyList(const json& nodes, const json& links) {
    AdjList adj;
    for (const auto& n : nodes) {
        adj[n["id"].get<string>()] = {};
    }
    for (const auto& l : links) {
        if (l.contains("failed") && l["failed"].get<bool>()) {
            continue;
        }
        string from = l["from"].get<string>();
        string to = l["to"].get<string>();
        double w = l["weight"].get<double>();
        
        adj[from].push_back({to, w});
        adj[to].push_back({from, w}); // Undirected graph
    }
    return adj;
}

// Helper: Reconstruct path
vector<string> reconstructPath(const unordered_map<string, string>& prev, const string& src, const string& dst) {
    vector<string> path;
    string cur = dst;
    unordered_set<string> visited;
    
    while (!cur.empty()) {
        if (visited.count(cur)) break; // Prevent cycle loops
        visited.insert(cur);
        path.push_back(cur);
        if (cur == src) break;
        
        auto it = prev.find(cur);
        if (it != prev.end()) {
            cur = it->second;
        } else {
            cur = "";
        }
    }
    
    if (path.empty() || path.back() != src) {
        return {};
    }
    reverse(path.begin(), path.end());
    return path;
}

// Convert map distances to JSON format, handling infinity
json serializeDistances(const unordered_map<string, double>& dist) {
    json j_dist = json::object();
    for (const auto& pair : dist) {
        if (pair.second == numeric_limits<double>::infinity()) {
            j_dist[pair.first] = nullptr; // Represent infinity as null in JSON
        } else {
            j_dist[pair.first] = pair.second;
        }
    }
    return j_dist;
}

// Algorithms
json runDijkstra(const json& nodes, const json& links, const string& src, const string& dst) {
    AdjList adj = buildAdjacencyList(nodes, links);
    unordered_map<string, double> dist;
    unordered_map<string, string> prev;
    json events = json::array();
    
    // Line 0: for each vertex v: dist[v] <- infinity
    events.push_back({{"type", "line"}, {"line", 0}});
    for (const auto& n : nodes) {
        string id = n["id"].get<string>();
        dist[id] = numeric_limits<double>::infinity();
        prev[id] = "";
    }
    
    // Line 1: dist[source] <- 0
    events.push_back({{"type", "line"}, {"line", 1}});
    dist[src] = 0;
    events.push_back({{"type", "init"}, {"source", src}, {"dist", serializeDistances(dist)}});
    
    // Line 2: PQ <- {(0, source)}
    events.push_back({{"type", "line"}, {"line", 2}});
    using pq_elem = pair<double, string>;
    priority_queue<pq_elem, vector<pq_elem>, greater<pq_elem>> pq;
    pq.push({0, src});
    events.push_back({{"type", "enqueue"}, {"node", src}, {"dist", 0}});
    
    unordered_set<string> settled;
    int ops = 0;
    
    // Line 3: while PQ not empty:
    events.push_back({{"type", "line"}, {"line", 3}});
    while (!pq.empty()) {
        // Line 4: u <- extractMin(PQ)
        events.push_back({{"type", "line"}, {"line", 4}});
        auto [d, u] = pq.top();
        pq.pop();
        ops++;
        
        if (settled.count(u)) continue;
        settled.insert(u);
        events.push_back({{"type", "visit"}, {"node", u}, {"dist", dist[u]}});
        
        // Line 5: for each edge (u, v, w):
        events.push_back({{"type", "line"}, {"line", 5}});
        for (const auto& edge : adj[u]) {
            string v = edge.to;
            double w = edge.weight;
            
            // Line 6: if dist[u] + w < dist[v]:
            events.push_back({{"type", "line"}, {"line", 6}});
            double nd = dist[u] + w;
            if (nd < dist[v]) {
                double oldD = dist[v];
                dist[v] = nd;
                prev[v] = u;
                
                // Line 7, 8, 9: dist[v] <- dist[u] + w, prev[v] <- u, PQ.push(v)
                events.push_back({{"type", "line"}, {"line", 7}});
                events.push_back({{"type", "line"}, {"line", 8}});
                events.push_back({{"type", "line"}, {"line", 9}});
                
                pq.push({nd, v});
                ops++;
                events.push_back({
                    {"type", "relax"}, 
                    {"from", u}, 
                    {"to", v}, 
                    {"newDist", nd}, 
                    {"oldDist", oldD == numeric_limits<double>::infinity() ? nullptr : json(oldD)}
                });
                events.push_back({{"type", "enqueue"}, {"node", v}, {"dist", nd}});
            }
        }
        events.push_back({{"type", "settle"}, {"node", u}, {"dist", dist[u]}});
        events.push_back({{"type", "line"}, {"line", 3}});
    }
    
    // Construct outputs
    json j_prev = json::object();
    for (const auto& pair : prev) {
        if (!pair.second.empty()) {
            j_prev[pair.first] = pair.second;
        }
    }
    
    events.push_back({{"type", "done"}, {"dist", serializeDistances(dist)}, {"prev", j_prev}, {"opCount", ops}});
    
    vector<string> path = reconstructPath(prev, src, dst);
    double cost = path.empty() ? 0 : dist[dst];
    
    return {
        {"events", events},
        {"path", path},
        {"cost", cost == numeric_limits<double>::infinity() ? 0 : cost}
    };
}

json runBFS(const json& nodes, const json& links, const string& src, const string& dst) {
    AdjList adj = buildAdjacencyList(nodes, links);
    unordered_map<string, double> dist;
    unordered_map<string, string> prev;
    json events = json::array();
    
    // Line 0: for each vertex v: dist[v] <- infinity
    events.push_back({{"type", "line"}, {"line", 0}});
    for (const auto& n : nodes) {
        string id = n["id"].get<string>();
        dist[id] = numeric_limits<double>::infinity();
        prev[id] = "";
    }
    
    // Line 1: dist[source] <- 0
    events.push_back({{"type", "line"}, {"line", 1}});
    dist[src] = 0;
    events.push_back({{"type", "init"}, {"source", src}, {"dist", serializeDistances(dist)}});
    
    // Line 2: Q <- [source]
    events.push_back({{"type", "line"}, {"line", 2}});
    queue<string> q;
    q.push(src);
    events.push_back({{"type", "enqueue"}, {"node", src}, {"dist", 0}});
    
    unordered_set<string> seen = {src};
    int ops = 0;
    
    // Line 3: while Q not empty:
    events.push_back({{"type", "line"}, {"line", 3}});
    while (!q.empty()) {
        // Line 4: u <- Q.dequeue()
        events.push_back({{"type", "line"}, {"line", 4}});
        string u = q.front();
        q.pop();
        ops++;
        events.push_back({{"type", "visit"}, {"node", u}, {"dist", dist[u]}});
        
        // Line 5: for each neighbor v of u:
        events.push_back({{"type", "line"}, {"line", 5}});
        for (const auto& edge : adj[u]) {
            string v = edge.to;
            
            // Line 6: if v not visited:
            events.push_back({{"type", "line"}, {"line", 6}});
            if (!seen.count(v)) {
                seen.insert(v);
                prev[v] = u;
                dist[v] = dist[u] + 1;
                
                // Line 7, 8, 9: dist[v] <- dist[u] + w, prev[v] <- u, Q.enqueue(v)
                events.push_back({{"type", "line"}, {"line", 7}});
                events.push_back({{"type", "line"}, {"line", 8}});
                events.push_back({{"type", "line"}, {"line", 9}});
                
                q.push(v);
                ops++;
                events.push_back({{"type", "relax"}, {"from", u}, {"to", v}, {"newDist", dist[v]}, {"oldDist", nullptr}});
                events.push_back({{"type", "enqueue"}, {"node", v}, {"dist", dist[v]}});
            }
        }
        events.push_back({{"type", "settle"}, {"node", u}, {"dist", dist[u]}});
        events.push_back({{"type", "line"}, {"line", 3}});
    }
    
    json j_prev = json::object();
    for (const auto& pair : prev) {
        if (!pair.second.empty()) {
            j_prev[pair.first] = pair.second;
        }
    }
    
    events.push_back({{"type", "done"}, {"dist", serializeDistances(dist)}, {"prev", j_prev}, {"opCount", ops}});
    vector<string> path = reconstructPath(prev, src, dst);
    double cost = path.empty() ? 0 : dist[dst];
    
    return {
        {"events", events},
        {"path", path},
        {"cost", cost == numeric_limits<double>::infinity() ? 0 : cost}
    };
}

// DFS Recursive helper simulation using stack events
json runDFS(const json& nodes, const json& links, const string& src, const string& dst) {
    AdjList adj = buildAdjacencyList(nodes, links);
    unordered_map<string, double> dist;
    unordered_map<string, string> prev;
    json events = json::array();
    
    // Line 0: for each vertex v: dist[v] <- infinity
    events.push_back({{"type", "line"}, {"line", 0}});
    for (const auto& n : nodes) {
        string id = n["id"].get<string>();
        dist[id] = numeric_limits<double>::infinity();
        prev[id] = "";
    }
    
    // Line 1: dist[source] <- 0
    events.push_back({{"type", "line"}, {"line", 1}});
    dist[src] = 0;
    events.push_back({{"type", "init"}, {"source", src}, {"dist", serializeDistances(dist)}});
    
    // Line 2: S <- [source]
    events.push_back({{"type", "line"}, {"line", 2}});
    vector<string> s_stack = {src};
    events.push_back({{"type", "enqueue"}, {"node", src}, {"dist", 0}});
    
    unordered_set<string> seen;
    int ops = 0;
    
    // Line 3: while S not empty:
    events.push_back({{"type", "line"}, {"line", 3}});
    while (!s_stack.empty()) {
        // Line 4: u <- S.pop()
        events.push_back({{"type", "line"}, {"line", 4}});
        string u = s_stack.back();
        s_stack.pop_back();
        ops++;
        
        if (seen.count(u)) continue;
        seen.insert(u);
        events.push_back({{"type", "visit"}, {"node", u}, {"dist", dist[u]}});
        
        // Line 5: for each neighbor v of u:
        events.push_back({{"type", "line"}, {"line", 5}});
        // Standard DFS explores in reverse order for graph traversal stack match
        auto neighbors = adj[u];
        reverse(neighbors.begin(), neighbors.end());
        for (const auto& edge : neighbors) {
            string v = edge.to;
            
            // Line 6: if v not visited:
            events.push_back({{"type", "line"}, {"line", 6}});
            if (!seen.count(v)) {
                prev[v] = u;
                dist[v] = dist[u] + 1;
                
                // Line 7, 8, 9
                events.push_back({{"type", "line"}, {"line", 7}});
                events.push_back({{"type", "line"}, {"line", 8}});
                events.push_back({{"type", "line"}, {"line", 9}});
                
                s_stack.push_back(v);
                ops++;
                events.push_back({{"type", "relax"}, {"from", u}, {"to", v}, {"newDist", dist[v]}, {"oldDist", nullptr}});
                events.push_back({{"type", "enqueue"}, {"node", v}, {"dist", dist[v]}});
            }
        }
        events.push_back({{"type", "settle"}, {"node", u}, {"dist", dist[u]}});
        events.push_back({{"type", "line"}, {"line", 3}});
    }
    
    json j_prev = json::object();
    for (const auto& pair : prev) {
        if (!pair.second.empty()) {
            j_prev[pair.first] = pair.second;
        }
    }
    
    events.push_back({{"type", "done"}, {"dist", serializeDistances(dist)}, {"prev", j_prev}, {"opCount", ops}});
    vector<string> path = reconstructPath(prev, src, dst);
    double cost = path.empty() ? 0 : dist[dst];
    
    return {
        {"events", events},
        {"path", path},
        {"cost", cost == numeric_limits<double>::infinity() ? 0 : cost}
    };
}

json runBellmanFord(const json& nodes, const json& links, const string& src, const string& dst) {
    unordered_map<string, double> dist;
    unordered_map<string, string> prev;
    json events = json::array();
    
    // Line 0: for each vertex v: dist[v] <- infinity
    events.push_back({{"type", "line"}, {"line", 0}});
    for (const auto& n : nodes) {
        string id = n["id"].get<string>();
        dist[id] = numeric_limits<double>::infinity();
        prev[id] = "";
    }
    
    // Line 1: dist[source] <- 0
    events.push_back({{"type", "line"}, {"line", 1}});
    dist[src] = 0;
    events.push_back({{"type", "init"}, {"source", src}, {"dist", serializeDistances(dist)}});
    
    int V = nodes.size();
    int ops = 0;
    
    // Extract non-failed links
    struct FlatEdge {
        string from;
        string to;
        double weight;
    };
    vector<FlatEdge> edges;
    for (const auto& l : links) {
        if (l.contains("failed") && l["failed"].get<bool>()) continue;
        string from = l["from"].get<string>();
        string to = l["to"].get<string>();
        double w = l["weight"].get<double>();
        edges.push_back({from, to, w});
        edges.push_back({to, from, w}); // Undirected
    }
    
    // Line 2: for i from 1 to |V|-1:
    events.push_back({{"type", "line"}, {"line", 2}});
    for (int i = 1; i <= V - 1; ++i) {
        // Line 3: for each edge (u, v, w):
        events.push_back({{"type", "line"}, {"line", 3}});
        for (const auto& edge : edges) {
            ops++;
            string u = edge.from;
            string v = edge.to;
            double w = edge.weight;
            
            // Line 4: if dist[u] + w < dist[v]:
            events.push_back({{"type", "line"}, {"line", 4}});
            if (dist[u] != numeric_limits<double>::infinity() && dist[u] + w < dist[v]) {
                double oldD = dist[v];
                dist[v] = dist[u] + w;
                prev[v] = u;
                
                // Line 5, 6
                events.push_back({{"type", "line"}, {"line", 5}});
                events.push_back({{"type", "line"}, {"line", 6}});
                
                events.push_back({{"type", "relax"}, {"from", u}, {"to", v}, {"newDist", dist[v]}, {"oldDist", oldD == numeric_limits<double>::infinity() ? nullptr : json(oldD)}});
                events.push_back({{"type", "enqueue"}, {"node", v}, {"dist", dist[v]}});
            }
        }
        events.push_back({{"type", "line"}, {"line", 2}});
    }
    
    // Line 7: check for negative-weight cycles
    events.push_back({{"type", "line"}, {"line", 7}});
    bool negativeCycle = false;
    for (const auto& edge : edges) {
        string u = edge.from;
        string v = edge.to;
        double w = edge.weight;
        
        // Line 8: if dist[u] + w < dist[v]: return error
        events.push_back({{"type", "line"}, {"line", 8}});
        if (dist[u] != numeric_limits<double>::infinity() && dist[u] + w < dist[v]) {
            negativeCycle = true;
            events.push_back({{"type", "negative-cycle"}});
            break;
        }
    }
    
    if (negativeCycle) {
        return {
            {"events", events},
            {"path", json::array()},
            {"cost", 0}
        };
    }
    
    json j_prev = json::object();
    for (const auto& pair : prev) {
        if (!pair.second.empty()) {
            j_prev[pair.first] = pair.second;
        }
    }
    
    events.push_back({{"type", "done"}, {"dist", serializeDistances(dist)}, {"prev", j_prev}, {"opCount", ops}});
    vector<string> path = reconstructPath(prev, src, dst);
    double cost = path.empty() ? 0 : dist[dst];
    
    return {
        {"events", events},
        {"path", path},
        {"cost", cost == numeric_limits<double>::infinity() ? 0 : cost}
    };
}

int main() {
    httplib::Server svr;
    
    cout << "--------------------------------------------------" << endl;
    cout << "  NetRouteX C++ DSA Routing Engine Active" << endl;
    cout << "  Listening on: http://localhost:8000" << endl;
    cout << "--------------------------------------------------" << endl;
    
    // /api/solve endpoint
    svr.Post("/api/solve", [](const httplib::Request& req, httplib::Response& res) {
        // Handle CORS Pre-flight & headers
        res.set_header("Access-Control-Allow-Origin", "*");
        res.set_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
        res.set_header("Access-Control-Allow-Headers", "Content-Type");
        res.set_header("Content-Type", "application/json");
        
        try {
            auto body = json::parse(req.body);
            string algo = body["algo"].get<string>();
            string source = body["source"].get<string>();
            string destination = body["destination"].get<string>();
            json nodes = body["nodes"];
            json links = body["links"];
            
            cout << "[API Request] Running " << algo << " from " << source << " to " << destination << endl;
            
            json result;
            if (algo == "dijkstra") {
                result = runDijkstra(nodes, links, source, destination);
            } else if (algo == "bfs") {
                result = runBFS(nodes, links, source, destination);
            } else if (algo == "dfs") {
                result = runDFS(nodes, links, source, destination);
            } else if (algo == "bellman-ford") {
                result = runBellmanFord(nodes, links, source, destination);
            } else {
                res.status = 400;
                res.body = json({{"error", "Unknown algorithm"}}).dump();
                return;
            }
            
            res.status = 200;
            res.body = result.dump();
            
        } catch (const exception& e) {
            cerr << "[Error] Request parse failed: " << e.what() << endl;
            res.status = 400;
            res.body = json({{"error", e.what()}}).dump();
        }
    });
    
    // Handle OPTIONS requests for CORS pre-flight
    svr.Options("/api/solve", [](const httplib::Request& req, httplib::Response& res) {
        res.set_header("Access-Control-Allow-Origin", "*");
        res.set_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
        res.set_header("Access-Control-Allow-Headers", "Content-Type");
        res.status = 200;
    });
    
    svr.listen("localhost", 8000);
    return 0;
}
