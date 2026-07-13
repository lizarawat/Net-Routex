// Binary min-heap priority queue.
export class MinPriorityQueue<T> {
  private heap: Array<{ key: number; value: T }> = [];

  get size() { return this.heap.length; }
  isEmpty() { return this.heap.length === 0; }
  peek() { return this.heap[0]; }
  snapshot() { return this.heap.map(x => ({ ...x })); }

  push(key: number, value: T) {
    this.heap.push({ key, value });
    this.siftUp(this.heap.length - 1);
  }

  pop(): { key: number; value: T } | undefined {
    if (this.heap.length === 0) return undefined;
    const top = this.heap[0];
    const last = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.siftDown(0);
    }
    return top;
  }

  private siftUp(i: number) {
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.heap[p].key <= this.heap[i].key) break;
      [this.heap[p], this.heap[i]] = [this.heap[i], this.heap[p]];
      i = p;
    }
  }
  private siftDown(i: number) {
    const n = this.heap.length;
    while (true) {
      const l = 2 * i + 1, r = 2 * i + 2;
      let s = i;
      if (l < n && this.heap[l].key < this.heap[s].key) s = l;
      if (r < n && this.heap[r].key < this.heap[s].key) s = r;
      if (s === i) break;
      [this.heap[s], this.heap[i]] = [this.heap[i], this.heap[s]];
      i = s;
    }
  }
}
