// Custom error class based on:
// https://gist.github.com/justmoon/15511f92e5216fa2624b

class NotFoundError extends Error {
  constructor(key) {
    super();
    
    this.name = this.constructor.name;
    this.key = key;
    this.message = `'${key}' not found in cache`;
  
    /* istanbul ignore next */
    if (typeof (Error.captureStackTrace) === 'function') {
      Error.captureStackTrace(this, this.constructor);
    } else {
      this.stack = (new Error(message)).stack;
    }
  }
  
  static build(key) {
    return new NotFoundError(key);
  }
  
}

export default NotFoundError;
export {
  NotFoundError
}