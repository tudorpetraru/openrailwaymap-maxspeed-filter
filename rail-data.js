(function (root) {
  "use strict";
  const CELL_SIZE = 0.5;
  const TTL = 45 * 24 * 60 * 60 * 1000;

  function cellAt(x, y) {
    x = ((x % 720) + 720) % 720;
    if (y < 0 || y >= 360) return null;
    return { key: `cell-v1:${x}:${y}`, x, y,
      south: y * CELL_SIZE - 90, west: x * CELL_SIZE - 180,
      north: (y + 1) * CELL_SIZE - 90, east: (x + 1) * CELL_SIZE - 180 };
  }

  function cellsForBounds({ south, west, north, east }) {
    if (![south, west, north, east].every(Number.isFinite)) return [];
    if (east < west) east += 360;
    const cells = new Map();
    for (let y = Math.max(0, Math.floor((south + 90) / CELL_SIZE));
      y < Math.min(360, Math.ceil((north + 90) / CELL_SIZE)); y++) {
      for (let x = Math.floor((west + 180) / CELL_SIZE);
        x < Math.ceil((Math.min(east, west + 360) + 180) / CELL_SIZE); x++) {
        const cell = cellAt(x, y);
        cells.set(cell.key, cell);
      }
    }
    return [...cells.values()];
  }

  function neighbors(cells) {
    const seen = new Set(cells.map(cell => cell.key));
    const result = [];
    for (const cell of cells) {
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const candidate = cellAt(cell.x + dx, cell.y + dy);
        if (candidate && !seen.has(candidate.key)) {
          seen.add(candidate.key);
          result.push(candidate);
        }
      }
    }
    return result;
  }

  function fresh(record) {
    return Boolean(record && Array.isArray(record.elements) &&
      Date.now() - record.timestamp <= TTL);
  }

  async function pool(items, limit, signal, work) {
    let next = 0;
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        signal.throwIfAborted();
        await work(items[next++]);
      }
    }));
  }

  const api = { CELL_SIZE, TTL, cellAt, cellsForBounds, neighbors, fresh, pool };
  if (typeof module !== "undefined") module.exports = api;
  else root.RailData = api;
})(globalThis);
