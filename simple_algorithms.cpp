#include <iostream>
#include <vector>
#include <unordered_map>
#include <unordered_set>
#include <queue>
#include <algorithm>

using namespace std;

// structure for representing links
struct Edge {
    string to;
    int weight;
};

class NetworkGraph {
private:
    unordered_map<string, vector<Edge>> adj; // Adjacency list

    // Helper: Backtracks parent pointers to find path sequence
    vector<string> reconstructPath(const unordered_map<string, string>& parent, string src, string dst) {
        vector<string> path;
        string cur = dst;
        while (cur != "") {
            path.push_back(cur);
            if (cur == src) break;
            auto it = parent.find(cur);
            cur = (it != parent.end()) ? it->second : "";
        }
        if (path.empty() || path.back() != src) return {};
        reverse(path.begin(), path.end());
        return path;
    }

public:
    // Adds an undirected connection to the graph
    void addLink(string u, string v, int weight) {
        adj[u].push_back({v, weight});
        adj[v].push_back({u, weight});
    }

    // 1. DIJKSTRA (Shortest Path on Weighted Graphs)
    void runDijkstra(string src, string dst) {
        unordered_map<string, int> dist;
        unordered_map<string, string> parent;
        for (auto const& pair : adj) dist[pair.first] = 999999; // Init to Infinity
        
        dist[src] = 0;
        
        // Min-Priority Queue stores: {distance, node}
        priority_queue<pair<int, string>, vector<pair<int, string>>, greater<pair<int, string>>> pq;
        pq.push({0, src});
        
        while (!pq.empty()) {
            string u = pq.top().second;
            pq.pop();
            
            if (u == dst) break;
            
            for (auto const& edge : adj[u]) {
                if (dist[u] + edge.weight < dist[edge.to]) {
                    dist[edge.to] = dist[u] + edge.weight; // Relax Edge
                    parent[edge.to] = u;
                    pq.push({dist[edge.to], edge.to});
                }
            }
        }
        
        vector<string> path = reconstructPath(parent, src, dst);
        cout << "[Dijkstra] Cost: " << dist[dst] << " | Path: ";
        for (const string& node : path) cout << node << " ";
        cout << endl;
    }

    // 2. BFS (Shortest Path on Unweighted Graphs)
    void runBFS(string src, string dst) {
        unordered_map<string, int> dist;
        unordered_map<string, string> parent;
        unordered_set<string> visited = {src};
        
        for (auto const& pair : adj) dist[pair.first] = 999999;
        dist[src] = 0;
        
        queue<string> q; // FIFO Queue
        q.push(src);
        
        while (!q.empty()) {
            string u = q.front();
            q.pop();
            
            if (u == dst) break;
            
            for (auto const& edge : adj[u]) {
                if (!visited.count(edge.to)) {
                    visited.insert(edge.to);
                    parent[edge.to] = u;
                    dist[edge.to] = dist[u] + 1; // Increment hop count by 1
                    q.push(edge.to);
                }
            }
        }
        
        vector<string> path = reconstructPath(parent, src, dst);
        cout << "[BFS] Hops: " << dist[dst] << " | Path: ";
        for (const string& node : path) cout << node << " ";
        cout << endl;
    }

    // 3. DFS (Traverses graph using recursion/stack)
    void runDFS(string src, string dst) {
        unordered_map<string, string> parent;
        unordered_set<string> visited;
        vector<string> s_stack = {src}; // LIFO Stack
        
        while (!s_stack.empty()) {
            string u = s_stack.back();
            s_stack.pop_back();
            
            if (visited.count(u)) continue;
            visited.insert(u);
            
            if (u == dst) break;
            
            for (auto const& edge : adj[u]) {
                if (!visited.count(edge.to)) {
                    parent[edge.to] = u;
                    s_stack.push_back(edge.to);
                }
            }
        }
        
        vector<string> path = reconstructPath(parent, src, dst);
        cout << "[DFS] Path: ";
        for (const string& node : path) cout << node << " ";
        cout << endl;
    }

    // 4. BELLMAN-FORD (Shortest Path & Negative Cycle Detection)
    void runBellmanFord(string src, string dst) {
        unordered_map<string, int> dist;
        unordered_map<string, string> parent;
        for (auto const& pair : adj) dist[pair.first] = 999999;
        dist[src] = 0;
        
        // Extract all edges in the graph
        struct FlatEdge { string from; string to; int weight; };
        vector<FlatEdge> edges;
        for (auto const& pair : adj) {
            for (auto const& edge : pair.second) {
                edges.push_back({pair.first, edge.to, edge.weight});
            }
        }
        
        int V = adj.size();
        // Relax all edges V-1 times
        for (int i = 1; i <= V - 1; ++i) {
            for (auto const& edge : edges) {
                if (dist[edge.from] != 999999 && dist[edge.from] + edge.weight < dist[edge.to]) {
                    dist[edge.to] = dist[edge.from] + edge.weight;
                    parent[edge.to] = edge.from;
                }
            }
        }
        
        // Scan one more time to check for negative-weight cycles
        bool negativeCycle = false;
        for (auto const& edge : edges) {
            if (dist[edge.from] != 999999 && dist[edge.from] + edge.weight < dist[edge.to]) {
                negativeCycle = true;
                break;
            }
        }
        
        if (negativeCycle) {
            cout << "[Bellman-Ford] Error: Detected a negative weight cycle!" << endl;
        } else {
            vector<string> path = reconstructPath(parent, src, dst);
            cout << "[Bellman-Ford] Cost: " << dist[dst] << " | Path: ";
            for (const string& node : path) cout << node << " ";
            cout << endl;
        }
    }
};

int main() {
    NetworkGraph graph;
    
    // Set up a simple 5-node test network
    graph.addLink("R0", "R1", 2);
    graph.addLink("R0", "R2", 4);
    graph.addLink("R1", "R3", 1);
    graph.addLink("R1", "R4", 5);
    graph.addLink("R2", "R4", 3);
    graph.addLink("R3", "R4", 1);
    
    // Demonstrate all 4 algorithms on the same graph
    cout << "--- Executing Network DSA Algorithms ---" << endl;
    graph.runDijkstra("R0", "R4");
    graph.runBFS("R0", "R4");
    graph.runDFS("R0", "R4");
    graph.runBellmanFord("R0", "R4");
    
    return 0;
}
