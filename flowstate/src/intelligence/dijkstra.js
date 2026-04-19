class MinHeap {
  constructor() {
    this.heap = [];
  }
  push(item) {
    this.heap.push(item);
    this._bubbleUp(this.heap.length - 1);
  }
  pop() {
    if (this.heap.length === 0) return null;
    if (this.heap.length === 1) return this.heap.pop();
    const top = this.heap[0];
    this.heap[0] = this.heap.pop();
    this._sinkDown(0);
    return top;
  }
  _bubbleUp(idx) {
    while (idx > 0) {
      let pIdx = Math.floor((idx - 1) / 2);
      if (this.heap[idx].distance >= this.heap[pIdx].distance) break;
      [this.heap[idx], this.heap[pIdx]] = [this.heap[pIdx], this.heap[idx]];
      idx = pIdx;
    }
  }
  _sinkDown(idx) {
    const end = this.heap.length;
    while (true) {
      let left = idx * 2 + 1;
      let right = idx * 2 + 2;
      let swap = null;
      if (left < end && this.heap[left].distance < this.heap[idx].distance) swap = left;
      if (right < end && this.heap[right].distance < (swap === null ? this.heap[idx].distance : this.heap[left].distance)) swap = right;
      if (swap === null) break;
      [this.heap[idx], this.heap[swap]] = [this.heap[swap], this.heap[idx]];
      idx = swap;
    }
  }
  isEmpty() { return this.heap.length === 0; }
}

export function dijkstra(adjList, fromNode, toNode, weightFn) {
  if (!adjList.has(fromNode) || !adjList.has(toNode)) return null;

  const distances = new Map();
  const previous = new Map();

  distances.set(fromNode, 0);
  previous.set(fromNode, null);
  
  const heap = new MinHeap();
  heap.push({ node: fromNode, distance: 0 });

  while (!heap.isEmpty()) {
    const { node: current, distance: currentDist } = heap.pop();
    
    if (current === toNode) break;
    
    if (currentDist > (distances.get(current) ?? Infinity)) continue;

    const neighbors = adjList.get(current) || [];
    for (const edge of neighbors) {
      const neighbor = edge.node;
      const weight = weightFn(current, edge);
      const newDistance = currentDist + weight;
      
      if (newDistance < (distances.get(neighbor) ?? Infinity)) {
        distances.set(neighbor, newDistance);
        previous.set(neighbor, current);
        heap.push({ node: neighbor, distance: newDistance });
      }
    }
  }

  if (!distances.has(toNode)) return null;

  const path = [];
  let current = toNode;
  while (current !== null) {
    path.unshift(current);
    current = previous.get(current);
  }
  
  if (path[0] !== fromNode) return null;
  return { path, cost: distances.get(toNode) };
}
