#ifdef __EMSCRIPTEN__
#include <emscripten/emscripten.h>
#endif

#include "nlohmann/json.hpp"
#include <iostream>
#include <vector>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <queue>
#include <algorithm>

using json = nlohmann::json;
using namespace std;

class NetworkGraph {
private:
    struct Edge {
        string to;
        double weight;
    };

    unordered_map<string, vector<Edge>> adj;
    json nodes;
    json links;

    void buildAdjacencyList() {
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
            adj[to].push_back({from, w}); 
        }
    }

    vector<string> reconstructPath(const unordered_map<string, string>& prev, const string& src, const string& dst) {
        vector<string> path;
        string cur = dst;
        unordered_set<string> visited;
        
        while (!cur.empty()) {
            if (visited.count(cur)) break;
            visited.insert(cur);
            path.push_back(cur);
            if (cur == src) break;
            
            auto it = prev.find(cur);
            cur = (it != prev.end()) ? it->second : "";
        }
        
        if (path.empty() || path.back() != src) return {};
        reverse(path.begin(), path.end());
        return path;
    }

    json serializeDistances(const unordered_map<string, double>& dist) {
        json j_dist = json::object();
        for (const auto& pair : dist) {
            if (pair.second == numeric_limits<double>::infinity()) {
                j_dist[pair.first] = nullptr;
            } else {
                j_dist[pair.first] = pair.second;
            }
        }
        return j_dist;
    }

public:
    NetworkGraph(const json& n, const json& l) : nodes(n), links(l) {
        buildAdjacencyList();
    }

    json runDijkstra(const string& src, const string& dst) {
        unordered_map<string, double> dist;
        unordered_map<string, string> prev;
        json events = json::array();
        
        events.push_back({{"type", "line"}, {"line", 0}});
        for (const auto& n : nodes) {
            string id = n["id"].get<string>();
            dist[id] = numeric_limits<double>::infinity();
            prev[id] = "";
        }
        
        events.push_back({{"type", "line"}, {"line", 1}});
        dist[src] = 0;
        events.push_back({{"type", "init"}, {"source", src}, {"dist", serializeDistances(dist)}});
        
        events.push_back({{"type", "line"}, {"line", 2}});
        using pq_elem = pair<double, string>;
        priority_queue<pq_elem, vector<pq_elem>, greater<pq_elem>> pq;
        pq.push({0, src});
        events.push_back({{"type", "enqueue"}, {"node", src}, {"dist", 0}});
        
        unordered_set<string> settled;
        int ops = 0;
        
        events.push_back({{"type", "line"}, {"line", 3}});
        while (!pq.empty()) {
            events.push_back({{"type", "line"}, {"line", 4}});
            auto [d, u] = pq.top();
            pq.pop();
            ops++;
            
            if (settled.count(u)) continue;
            settled.insert(u);
            events.push_back({{"type", "visit"}, {"node", u}, {"dist", dist[u]}});
            
            events.push_back({{"type", "line"}, {"line", 5}});
            for (const auto& edge : adj[u]) {
                string v = edge.to;
                double w = edge.weight;
                
                events.push_back({{"type", "line"}, {"line", 6}});
                double nd = dist[u] + w;
                if (nd < dist[v]) {
                    double oldD = dist[v];
                    dist[v] = nd;
                    prev[v] = u;
                    
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
        
        json j_prev = json::object();
        for (const auto& pair : prev) {
            if (!pair.second.empty()) j_prev[pair.first] = pair.second;
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

    json runBFS(const string& src, const string& dst) {
        unordered_map<string, double> dist;
        unordered_map<string, string> prev;
        json events = json::array();
        
        events.push_back({{"type", "line"}, {"line", 0}});
        for (const auto& n : nodes) {
            string id = n["id"].get<string>();
            dist[id] = numeric_limits<double>::infinity();
            prev[id] = "";
        }
        
        events.push_back({{"type", "line"}, {"line", 1}});
        dist[src] = 0;
        events.push_back({{"type", "init"}, {"source", src}, {"dist", serializeDistances(dist)}});
        
        events.push_back({{"type", "line"}, {"line", 2}});
        queue<string> q;
        q.push(src);
        events.push_back({{"type", "enqueue"}, {"node", src}, {"dist", 0}});
        
        unordered_set<string> seen = {src};
        int ops = 0;
        
        events.push_back({{"type", "line"}, {"line", 3}});
        while (!q.empty()) {
            events.push_back({{"type", "line"}, {"line", 4}});
            string u = q.front();
            q.pop();
            ops++;
            events.push_back({{"type", "visit"}, {"node", u}, {"dist", dist[u]}});
            
            events.push_back({{"type", "line"}, {"line", 5}});
            for (const auto& edge : adj[u]) {
                string v = edge.to;
                
                events.push_back({{"type", "line"}, {"line", 6}});
                if (!seen.count(v)) {
                    seen.insert(v);
                    prev[v] = u;
                    dist[v] = dist[u] + 1;
                    
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
            if (!pair.second.empty()) j_prev[pair.first] = pair.second;
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

    json runDFS(const string& src, const string& dst) {
        unordered_map<string, double> dist;
        unordered_map<string, string> prev;
        json events = json::array();
        
        events.push_back({{"type", "line"}, {"line", 0}});
        for (const auto& n : nodes) {
            string id = n["id"].get<string>();
            dist[id] = numeric_limits<double>::infinity();
            prev[id] = "";
        }
        
        events.push_back({{"type", "line"}, {"line", 1}});
        dist[src] = 0;
        events.push_back({{"type", "init"}, {"source", src}, {"dist", serializeDistances(dist)}});
        
        events.push_back({{"type", "line"}, {"line", 2}});
        vector<string> s_stack = {src};
        events.push_back({{"type", "enqueue"}, {"node", src}, {"dist", 0}});
        
        unordered_set<string> seen;
        int ops = 0;
        
        events.push_back({{"type", "line"}, {"line", 3}});
        while (!s_stack.empty()) {
            events.push_back({{"type", "line"}, {"line", 4}});
            string u = s_stack.back();
            s_stack.pop_back();
            ops++;
            
            if (seen.count(u)) continue;
            seen.insert(u);
            events.push_back({{"type", "visit"}, {"node", u}, {"dist", dist[u]}});
            
            events.push_back({{"type", "line"}, {"line", 5}});
            auto neighbors = adj[u];
            reverse(neighbors.begin(), neighbors.end());
            for (const auto& edge : neighbors) {
                string v = edge.to;
                
                events.push_back({{"type", "line"}, {"line", 6}});
                if (!seen.count(v)) {
                    prev[v] = u;
                    dist[v] = dist[u] + 1;
                    
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
            if (!pair.second.empty()) j_prev[pair.first] = pair.second;
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

    json runBellmanFord(const string& src, const string& dst) {
        unordered_map<string, double> dist;
        unordered_map<string, string> prev;
        json events = json::array();
        
        events.push_back({{"type", "line"}, {"line", 0}});
        for (const auto& n : nodes) {
            string id = n["id"].get<string>();
            dist[id] = numeric_limits<double>::infinity();
            prev[id] = "";
        }
        
        events.push_back({{"type", "line"}, {"line", 1}});
        dist[src] = 0;
        events.push_back({{"type", "init"}, {"source", src}, {"dist", serializeDistances(dist)}});
        
        int V = nodes.size();
        int ops = 0;
        
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
            edges.push_back({to, from, w});
        }
        
        events.push_back({{"type", "line"}, {"line", 2}});
        for (int i = 1; i <= V - 1; ++i) {
            events.push_back({{"type", "line"}, {"line", 3}});
            for (const auto& edge : edges) {
                ops++;
                string u = edge.from;
                string v = edge.to;
                double w = edge.weight;
                
                events.push_back({{"type", "line"}, {"line", 4}});
                if (dist[u] != numeric_limits<double>::infinity() && dist[u] + w < dist[v]) {
                    double oldD = dist[v];
                    dist[v] = dist[u] + w;
                    prev[v] = u;
                    
                    events.push_back({{"type", "line"}, {"line", 5}});
                    events.push_back({{"type", "line"}, {"line", 6}});
                    
                    events.push_back({{"type", "relax"}, {"from", u}, {"to", v}, {"newDist", dist[v]}, {"oldDist", oldD == numeric_limits<double>::infinity() ? nullptr : json(oldD)}});
                    events.push_back({{"type", "enqueue"}, {"node", v}, {"dist", dist[v]}});
                }
            }
            events.push_back({{"type", "line"}, {"line", 2}});
        }
        
        events.push_back({{"type", "line"}, {"line", 7}});
        bool negativeCycle = false;
        for (const auto& edge : edges) {
            string u = edge.from;
            string v = edge.to;
            double w = edge.weight;
            
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
            if (!pair.second.empty()) j_prev[pair.first] = pair.second;
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
};

#ifdef __EMSCRIPTEN__
extern "C" {

EMSCRIPTEN_KEEPALIVE
const char* solveGraph(const char* nodesJsonStr, const char* linksJsonStr, const char* sourceStr, const char* destinationStr, const char* algoStr) {
    try {
        json nodes = json::parse(nodesJsonStr);
        json links = json::parse(linksJsonStr);
        string source(sourceStr);
        string destination(destinationStr);
        string algo(algoStr);
        
        NetworkGraph graph(nodes, links);
        json result;
        
        if (algo == "dijkstra") {
            result = graph.runDijkstra(source, destination);
        } else if (algo == "bfs") {
            result = graph.runBFS(source, destination);
        } else if (algo == "dfs") {
            result = graph.runDFS(source, destination);
        } else if (algo == "bellman-ford") {
            result = graph.runBellmanFord(source, destination);
        } else {
            return "{\"error\":\"Unknown algorithm\"}";
        }
        
        static string responseBuffer;
        responseBuffer = result.dump();
        return responseBuffer.c_str();
        
    } catch (const exception& e) {
        static string errBuffer;
        errBuffer = string("{\"error\":\"") + e.what() + "\"}";
        return errBuffer.c_str();
    }
}

}
#endif
