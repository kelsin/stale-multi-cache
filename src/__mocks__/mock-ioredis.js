const { Promise, Buffer } = global;
const cache = {};

// Simple client that behaves like ioredis
class Redis {
  get(key) {
    return this.getBuffer(key);
  }
  getBuffer(key) {
    if(cache[key]) {
      return Promise.resolve(cache[key]);
    } else {
      return Promise.resolve(null);
    }
  }
  set(key, value) {
    cache[key] = value;
    return Promise.resolve('OK');
  }
  setBuffer(key, value) {
    cache[key] = value;
    return Promise.resolve(Buffer.from('OK'));
  }
}

export default Redis;
export {
  Redis,
  cache
}