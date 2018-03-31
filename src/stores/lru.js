// In memory LRU cache using node-lru-cache
import LRU from 'lru-cache';
import Promise from 'bluebird';
import { NotFoundError } from 'src/errors/notFound';

import { Is } from 'src/util';

class LRUMemoryStore {
  
  /* istanbul ignore next */
  static build(options) {
    return new LRUMemoryStore(options);
  }
  
  static getClassName(){ return 'LRUMemoryStore'; }
  getClassName(){ return LRUMemoryStore.getClassName(); }
  
  constructor(options) {
    this.cache = LRU(options);
  }
  
  get(key) {
    const value = this.cache.get(key);
    if(Is.undef(value)) {
      return Promise.reject(NotFoundError.build(key));
    } else {
      return Promise.resolve(value);
    }
  }
  
  set(key, value) {
    this.cache.set(key, value);
    return Promise.resolve(value);
  }
}

export default LRUMemoryStore;
export {
  LRUMemoryStore
}
