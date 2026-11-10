/** Each signed-in user has separate fallback data; legacy shared keys are ignored. */
export function userCache(storage: Storage, userId: string) {
  const key = (name: string) => `${name}:${userId}`;
  return {
    getItem: (name: string) => storage.getItem(key(name)),
    setItem: (name: string, value: string) => storage.setItem(key(name), value),
    removeItem: (name: string) => storage.removeItem(key(name)),
  };
}
