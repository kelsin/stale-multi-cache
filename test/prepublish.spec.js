// @flow
//region typing, stripped during compiling
import type { describe, test, expect } from '@types/jest';
//endregion

const { Cache, NoopStore } = require('stale-multi-cache');

describe('require', () => {
  test('should return constructor', () => {
    expect(Cache.constructor).toBeDefined();
    
    const noopStore = new NoopStore();
    const cache = new Cache([noopStore]);
  
    expect(cache).toBeDefined();
    expect(cache.stores).toBeDefined();
    expect(cache.wrap).toBeFunction();
  })
});
