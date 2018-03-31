// Simple in memory cache made with an object... I meant simple
import Promise from 'bluebird';
import { NotFoundError } from 'src/errors/notFound';

class SimpleMemoryStore {
  
  /* istanbul ignore next */
  static build(data) {
    return new SimpleMemoryStore(data);
  }
  
  static getClassName(){ return 'SimpleMemoryStore'; }
  getClassName(){ return SimpleMemoryStore.getClassName(); }
  
  constructor(data) {
    this.data = data || {};
  }
  
  get(key) {
    if(this.data.hasOwnProperty(key)) {
      return Promise.resolve(this.data[key]);
    } else {
      return Promise.reject(NotFoundError.build(key));
    }
  }
  
  set(key, value) {
    this.data[key] = value;
    return Promise.resolve(this.data[key]);
  }
}

export default SimpleMemoryStore;
export {
  SimpleMemoryStore
}
