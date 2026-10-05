/**
 * FNV-1a (32-bit) over a stream of numbers, for determinism checks: the same run state always
 * gives the same digest. Numbers are hashed by their exact IEEE-754 bits, so even a last-bit
 * difference changes the digest. Allocation-free after construction.
 */
export class StateHasher {
  private hash = 0x811c9dc5;
  private readonly view = new DataView(new ArrayBuffer(8));

  reset(): this {
    this.hash = 0x811c9dc5;
    return this;
  }

  number(value: number): this {
    this.view.setFloat64(0, value);
    for (let i = 0; i < 8; i++) this.byte(this.view.getUint8(i));
    return this;
  }

  bool(value: boolean): this {
    this.byte(value ? 1 : 0);
    return this;
  }

  string(value: string): this {
    for (let i = 0; i < value.length; i++) this.number(value.charCodeAt(i));
    return this;
  }

  /** The digest as 8 hex digits. */
  digest(): string {
    return this.hash.toString(16).padStart(8, '0');
  }

  private byte(value: number): void {
    this.hash = Math.imul(this.hash ^ value, 0x01000193) >>> 0;
  }
}
