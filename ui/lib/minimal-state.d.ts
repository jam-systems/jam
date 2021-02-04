export default function <T extends {}>(
  initialState: T
): {
  get: {
    <L extends keyof T>(): T;
    <L extends keyof T>(key: L): T[L];
  };
  set<L extends keyof T>(key: L, value: T[L]): void;
  update(key?: keyof T | undefined): void;
  on(key: keyof T | undefined, listener: (...args: unknown[]) => void): void;
  off(key: keyof T | undefined, listener: (...args: unknown[]) => void): void;
  emit(key: keyof T | undefined, ...args: unknown[]): void;
  clear(): void;
  map: Map<keyof T | undefined, Set<(...args: unknown[]) => void>>;
} & T;
