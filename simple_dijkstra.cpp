#include <iostream>
#include <vector>
#include <unordered_map>
#include <queue>
#include <algorithm>

using namespace std;

// 1. Structure to represent a connection/link
struct Edge {
    string destination;
    int weight;
};

// 2. The Dijkstra Algorithm function
void runDijkstra(
    unordered_map<string, vector<Edge>>& graph, 
    string source, 
    string target
) {
    // Maps to store the shortest distances and path parent pointers
    unordered_map<string, int> dist;
    unordered_map<string, string> parent;
    
    // Initialize all distances to Infinity (represented by a very large number)
    for (auto const& pair : graph) {
        dist[pair.first] = 999999; 
    }
    
    // Distance from source to source is always 0
    dist[source] = 0;
    
    // Min-Priority Queue stores pairs of: {distance, node_id}
    // It automatically keeps the smallest distance at the top
    priority_queue<pair<int, string>, vector<pair<int, string>>, greater<pair<int, string>>> pq;
    pq.push({0, source});
    
    while (!pq.empty()) {
        // Get the node with the smallest distance
        string u = pq.top().second;
        pq.pop();
        
        // Stop if we reached our target destination
        if (u == target) break;
        
        // Check all neighboring connections of node 'u'
        for (auto const& edge : graph[u]) {
            string v = edge.destination;
            int weight = edge.weight;
            
            // Relaxation Step: If we find a shorter path to 'v' through 'u'
            if (dist[u] + weight < dist[v]) {
                dist[v] = dist[u] + weight; // Update distance
                parent[v] = u;              // Update parent pointer
                pq.push({dist[v], v});      // Push to queue
            }
        }
    }
    
    // Print the output results
    cout << "Shortest Distance from " << source << " to " << target << " is: " << dist[target] << endl;
    
    // Reconstruct the path backwards from target to source
    vector<string> path;
    string current = target;
    while (current != "") {
        path.push_back(current);
        current = parent[current];
    }
    reverse(path.begin(), path.end());
    
    // Print the path sequence
    cout << "Path Taken: ";
    for (int i = 0; i < path.size(); i++) {
        cout << path[i] << (i == path.size() - 1 ? "" : " -> ");
    }
    cout << endl;
}

int main() {
    // Create a simple graph of 5 routers
    unordered_map<string, vector<Edge>> graph;
    
    // Add links (Router A connected to B, C, etc.)
    graph["R0"] = { {"R1", 2}, {"R2", 4} };
    graph["R1"] = { {"R0", 2}, {"R3", 1}, {"R4", 5} };
    graph["R2"] = { {"R0", 4}, {"R4", 3} };
    graph["R3"] = { {"R1", 1}, {"R4", 1} };
    graph["R4"] = { {"R1", 5}, {"R2", 3}, {"R3", 1} };
    
    // Run the algorithm
    runDijkstra(graph, "R0", "R4");
    
    return 0;
}
