// No-op cache store
//
// This store does nothing on set, and always returns a rejected promise on gets

import Promise from 'bluebird';

class ErrorStore {
  
  /* istanbul ignore next */
  static build() {
    return new ErrorStore();
  }
  
  static getClassName(){ return 'ErrorStore'; }
  getClassName(){ return ErrorStore.getClassName(); }
  
  get(key) {
    return Promise.reject(new Error("Calling get on ErrorStore", key));
  }
  
  set(key, value) {
    return Promise.reject(new Error("Calling set on ErrorStore"));
  }
}

export default ErrorStore;
export {
  ErrorStore
}