import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, copyFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

test('health probe reuses the verified pool without schema initialization or leaking new pools on failure', async () => {
  const tmp = await mkdtemp(path.join(tmpdir(), 'gaokao-pool-'));
  const previous = process.env.POSTGRES_URL;
  globalThis.__gaokaoPoolTest = { pools: [], queries: [], fail: false };
  const state = globalThis.__gaokaoPoolTest;
  try {
    await writeFile(path.join(tmp, 'package.json'), '{"type":"module"}');
    await copyFile(new URL('../api/lib/db.ts', import.meta.url), path.join(tmp, 'db.ts'));
    for (const name of ['pg', 'uuid']) {
      await mkdir(path.join(tmp, 'node_modules', name), { recursive: true });
      await writeFile(path.join(tmp, 'node_modules', name, 'package.json'), JSON.stringify({ name, main: 'index.js' }));
    }
    await writeFile(path.join(tmp, 'node_modules/pg/index.js'), `
      exports.Pool = class {
        constructor(config) { globalThis.__gaokaoPoolTest.pools.push(config); }
        on() {}
        async query(config) {
          const state = globalThis.__gaokaoPoolTest;
          state.queries.push(config);
          if (state.fail) throw new Error('simulated database failure');
          return { rows: [] };
        }
        async end() {}
      };
    `);
    await writeFile(path.join(tmp, 'node_modules/uuid/index.js'), `exports.v4 = () => 'test-id';`);
    process.env.POSTGRES_URL = 'postgres://test.invalid/database?sslmode=require';
    const db = await import(path.join(tmp, 'db.ts'));
    await db.pingDatabase();
    await db.pingDatabase();
    state.fail = true;
    await assert.rejects(db.pingDatabase(), /simulated database failure/);
    assert.equal(state.pools.length, 1);
    assert.deepEqual(state.pools[0].ssl, { rejectUnauthorized: true });
    assert.equal(state.pools[0].max, 5);
    assert.deepEqual(state.queries, Array(3).fill({ text: 'SELECT 1', query_timeout: 5000 }));
    await db.closeDatabase();
  } finally {
    if (previous === undefined) delete process.env.POSTGRES_URL;
    else process.env.POSTGRES_URL = previous;
    delete globalThis.__gaokaoPoolTest;
    await rm(tmp, { recursive: true, force: true });
  }
});
