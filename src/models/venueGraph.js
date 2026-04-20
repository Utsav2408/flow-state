import { CONGESTION_LOAD_SQ_COEFF } from '../config/routingConstants';
import { dijkstra as runDijkstra } from '../intelligence/dijkstra';
import { getNodeCanvasPos } from './venueLayout';

export class VenueGraph {
  constructor() {
    this.adjacencyList = new Map();
    this.nodes = new Map();
  }

  addNode(nodeId, type, metadata = {}) {
    if (!this.adjacencyList.has(nodeId)) {
      this.adjacencyList.set(nodeId, []);
      this.nodes.set(nodeId, { id: nodeId, type, ...metadata });
    }
  }

  addEdge(node1, node2, distanceFallback, capacity, currentLoad = 0) {
    if (this.adjacencyList.has(node1) && this.adjacencyList.has(node2)) {
      const pos1 = getNodeCanvasPos(node1);
      const pos2 = getNodeCanvasPos(node2);
      let distance = distanceFallback;
      if (pos1 && pos2) {
        distance = Math.round(Math.hypot(pos1.x - pos2.x, pos1.y - pos2.y) / 5);
        if (distance < 1) distance = 1;
      }
      this.adjacencyList.get(node1).push({ node: node2, distance, capacity, currentLoad });
      this.adjacencyList.get(node2).push({ node: node1, distance, capacity, currentLoad });
    }
  }



  getWeight(edge) {
    return edge.distance * (1 + Math.pow(edge.currentLoad, 2) * CONGESTION_LOAD_SQ_COEFF);
  }

  getNeighbors(nodeId) {
    return this.adjacencyList.get(nodeId) || [];
  }

  getAllZones() {
    return Array.from(this.nodes.values()).filter(n => n.type === 'zone');
  }

  getAllStands() {
    return Array.from(this.nodes.values()).filter(n => n.type === 'stand');
  }

  getShortestPath(fromNode, toNode) {
    const result = runDijkstra(this.adjacencyList, fromNode, toNode, (cur, edge) => this.getWeight(edge));
    return result ? result.path : null;
  }
}

// Singleton instance
const graph = new VenueGraph();

// Initialize nodes
// Zones: A1-A4, B1-B6, C1-C6, D1-D3
const zones = [...Array.from({length: 4}, (_, i) => `A${i+1}`), 
               ...Array.from({length: 6}, (_, i) => `B${i+1}`),
               ...Array.from({length: 6}, (_, i) => `C${i+1}`),
               ...Array.from({length: 3}, (_, i) => `D${i+1}`)];
zones.forEach(z => graph.addNode(z, 'zone'));

// Stands S1-S12
const stands = Array.from({length: 12}, (_, i) => `S${i+1}`);
stands.forEach(s => graph.addNode(s, 'stand'));

// Restrooms R1-R8
const restrooms = Array.from({length: 8}, (_, i) => `R${i+1}`);
restrooms.forEach(r => graph.addNode(r, 'restroom'));

// Gates G1-G4
const gates = Array.from({length: 4}, (_, i) => `G${i+1}`);
gates.forEach(g => graph.addNode(g, 'gate'));

// Initialize basic ring topology for demo
// Adding some random connections
for (let i=0; i<zones.length-1; i++) {
  graph.addEdge(zones[i], zones[i+1], 10, 1000, 0);
}
graph.addEdge(zones[zones.length-1], zones[0], 10, 1000, 0);

for(let i=0; i<4; i++) {
  graph.addEdge(gates[i], zones[i*4], 50, 5000, 0.1);
}

// Connect stands to nearby zones for routing
graph.addEdge('S1', 'A1', 18, 500, 0);
graph.addEdge('S2', 'A2', 18, 500, 0);
graph.addEdge('S3', 'B1', 15, 500, 0);
graph.addEdge('S3', 'B2', 15, 500, 0);
graph.addEdge('S4', 'B3', 18, 500, 0);
graph.addEdge('S5', 'A3', 20, 500, 0);
graph.addEdge('S5', 'D1', 20, 500, 0);
graph.addEdge('S6', 'D2', 18, 500, 0);
graph.addEdge('S7', 'B4', 15, 500, 0);
graph.addEdge('S7', 'B5', 15, 500, 0);
graph.addEdge('S8', 'B6', 18, 500, 0);
graph.addEdge('S9', 'C3', 18, 500, 0);
graph.addEdge('S10', 'C4', 18, 500, 0);
graph.addEdge('S11', 'C5', 18, 500, 0);
graph.addEdge('S12', 'C1', 15, 500, 0);
graph.addEdge('S12', 'C2', 15, 500, 0);

// Connect restrooms to nearby zones
graph.addEdge('R1', 'A1', 12, 300, 0);
graph.addEdge('R2', 'B2', 12, 300, 0);
graph.addEdge('R3', 'B5', 12, 300, 0);
graph.addEdge('R4', 'C2', 12, 300, 0);
graph.addEdge('R5', 'C5', 12, 300, 0);
graph.addEdge('R6', 'D1', 12, 300, 0);
graph.addEdge('R7', 'D3', 12, 300, 0);
graph.addEdge('R8', 'C6', 12, 300, 0);

export default graph;
