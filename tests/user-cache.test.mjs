import test from 'node:test';
import assert from 'node:assert/strict';
import { userCache } from '../services/userCache.ts';

test('fallback cache isolates accounts and never reads legacy shared data', () => {
  const data = new Map([['app_error_notebook', 'legacy private data']]);
  const storage = {
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    removeItem: key => data.delete(key),
  };
  const first = userCache(storage, 'user-a');
  const second = userCache(storage, 'user-b');
  for (const name of ['app_error_notebook', 'app_search_history']) {
    assert.equal(first.getItem(name), null);
    first.setItem(name, 'first user');
    assert.equal(second.getItem(name), null);
    second.setItem(name, 'second user');
    assert.equal(first.getItem(name), 'first user');
    first.removeItem(name);
    assert.equal(first.getItem(name), null);
    assert.equal(second.getItem(name), 'second user');
  }
});
