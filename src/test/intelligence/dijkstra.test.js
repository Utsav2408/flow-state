import { describe, expect, it } from 'vitest';
import { dijkstra } from '../../intelligence/dijkstra';

function makeGraph(edges) {
  const adj = new Map();
  for (const [from, to, distance] of edges) {
    if (!adj.has(from)) adj.set(from, []);
    if (!adj.has(to)) adj.set(to, []);
    adj.get(from).push({ node: to, distance });
  }
  return adj;
}

describe('dijkstra', () => {
  it('returns null when source node is missing', () => {
    const adj = makeGraph([['A', 'B', 1]]);
    expect(dijkstra(adj, 'X', 'B', (_, edge) => edge.distance)).toBeNull();
  });

  it('returns null when destination node is missing', () => {
    const adj = makeGraph([['A', 'B', 1]]);
    expect(dijkstra(adj, 'A', 'Z', (_, edge) => edge.distance)).toBeNull();
  });

  it('returns null when no path exists', () => {
    const adj = makeGraph([
      ['A', 'B', 3],
      ['C', 'D', 2],
    ]);
    expect(dijkstra(adj, 'A', 'D', (_, edge) => edge.distance)).toBeNull();
  });

  it('returns a single-node path when source equals destination', () => {
    const adj = makeGraph([['A', 'B', 1]]);
    const result = dijkstra(adj, 'A', 'A', (_, edge) => edge.distance);
    expect(result).toEqual({ path: ['A'], cost: 0 });
  });

  it('returns cheapest path and total cost', () => {
    const adj = makeGraph([
      ['A', 'B', 4],
      ['A', 'C', 1],
      ['C', 'B', 1],
      ['B', 'D', 1],
      ['C', 'D', 10],
    ]);

    const result = dijkstra(adj, 'A', 'D', (_, edge) => edge.distance);

    expect(result).toEqual({
      path: ['A', 'C', 'B', 'D'],
      cost: 3,
    });
  });

  it('supports custom weights from weightFn', () => {
    const adj = makeGraph([
      ['A', 'B', 1],
      ['A', 'C', 1],
      ['C', 'B', 1],
    ]);

    const result = dijkstra(adj, 'A', 'B', (cur, edge) => {
      if (cur === 'A' && edge.node === 'B') return 50;
      return edge.distance;
    });

    expect(result).toEqual({
      path: ['A', 'C', 'B'],
      cost: 2,
    });
  });
});
