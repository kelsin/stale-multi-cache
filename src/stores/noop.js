/**
 * No-op cache store.
 *
 * This store does nothing on set, and always returns a rejected promise on gets
 *
 * @module store/noop
 * @file src/stores/noop.js
 */

import Promise from 'bluebird';
import { NotFoundError } from 'src/errors/notFound';

class NoopStore {
  
  /* istanbul ignore next */
  static build() {
    return new NoopStore();
  }
  
  static getClassName(){ return 'NoopStore'; }
  getClassName(){ return NoopStore.getClassName(); }
  
  get(key) {
    return Promise.reject(NotFoundError.build(key));
  }
  
  set(key, value) {
    return Promise.resolve(value);
  }
}

export default NoopStore;
export {
  NoopStore
}
