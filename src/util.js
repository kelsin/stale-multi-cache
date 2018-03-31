import Promise from 'bluebird';
import is from 'is';
import parse from 'fast-json-parse';
import stringify from 'fast-safe-stringify';

import { compress, decompress } from 'iltorb';

import { Logger } from 'src/logger';

const toString = ({}).toString;
const { Buffer } = global;

/* istanbul ignore next */
Number['isInteger'] = Number.isInteger || function(value) {
  return typeof value === 'number' &&
    isFinite(value) &&
    Math.floor(value) === value;
};

/* istanbul ignore next */
Number['isFinite'] = Number.isFinite || function(value) {
  return typeof value === 'number' && isFinite(value);
};

/* istanbul ignore next */
Array.isArray = Array.isArray || function(arg) {
  return Object.prototype.toString.call(arg) === '[object Array]';
};

/* istanbul ignore next */
class Util {
  
  static p_pipe(...promises) {
    const args = Util.flatten([...promises]);
    
    if (args.length === 0) {
      return Promise.reject(new Error('expected at least one argument'));
    }
    
    return [].slice.call(args, 1).reduce((a, b) => {
      return (...args) => {
        return Promise.resolve(a(...args)).then(b);
      };
    }, args[0]);
  }
  
  /**
   * Freezes an object to:
   *
   * - prevents new properties from being added to it
   * - prevents existing properties from being removed
   * - prevents existing properties, or their enumerability, configurability, or writability, from being changed
   * - prevents the prototype from being changed
   *
   * @param obj        the {Object} to freeze
   * @returns {Object} the passed {Object}.
   */
  static deepFreeze(obj) {
    
    // Retrieve the property names defined on obj
    const propNames = Object.getOwnPropertyNames(obj);
    
    // Freeze properties before freezing self
    propNames.forEach(function(name) {
      const prop = obj[name];
      
      // Freeze prop if it is an object
      if (typeof prop === 'object' && prop !== null)
        Util.deepFreeze(prop);
    });
    
    // Freeze self (no-op if already frozen)
    return Object.freeze(obj);
  }
  
  /**
   * Reduce nested arrays
   *
   * @param array target {Array} to flatten
   * @param ret   response {Array} to return
   */
  static flatten(array, ret = []) {
    return array.reduce((ret, entry) => {
      if (Array.isArray(entry)) {
        Util.flatten(entry, ret);
      } else {
        ret.push(entry);
      }
      return ret;
    }, ret);
  }
  
  static clone(target) {
      const result = parse(stringify(target));
      if (result.err) {
          throw new Error(result.err.message);
      }
      return result.value;
  }
  
  /**
   * Async wrapper with error handling.
   *
   * @param promise  {Promise} to wrap
   * @param errorExt additional metadata to hoist to {Error}
   * @param freeze   freeze response object to prevent new properties from being added
   */
  static exec(promise, errorExt, freeze = false) {
    return promise
      .then((data) => {
        return freeze ? [null, Util.deepFreeze(data)] : [null, data];
      })
      .catch((err) => {
        if(errorExt) {
          err = Object.assign(err, errorExt);
        }
        return [err];
      });
  }
  
  static compress(buffer, encoding) {
    return new Promise((resolve, reject) => {
      compress(Buffer.from(buffer), encoding, (err, output) => {
        if (err) {
          return reject(err);
        } else {
          const buf = Buffer.from(output);
          Logger.debug(`compress buffer size: ${Buffer.byteLength(buf)}`);
          return resolve(buf);
        }
      })
    })
  }
  
  static decompress(buffer) {
    return new Promise((resolve, reject) => {
      decompress(Buffer.from(buffer), (err, output) => {
        if (err) {
          return reject(err);
        } else {
          const buf = Buffer.from(output);
          Logger.debug(`decompress buffer size: ${Buffer.byteLength(buf)}`);
          return resolve(buf.toString());
        }
      })
    })
  }
  
}


/* istanbul ignore next */
class Is {
  
  //region is proxy
  static type(value) { return is.type(value); }
  
  static a(value) { return is.a(value); }
  
  static defined(value) { return is.defined(value); }
  
  static empty(value) { return is.empty(value); }
  
  static equal(value) { return is.equal(value); }
  
  static hosted(value) { return is.hosted(value); }
  
  static instanceof(value) { return is.instanceof(value); }
  
  static instance(value) { return is.instance(value); }
  
  static null(value) { return is.null(value); }
  
  static nil(value) { return is.nil(value); }
  
  static undefined(value) { return is.undefined(value); }
  
  static undef(value) { return is.undef(value); }
  
  static arguments(value) { return is.arguments(value); }
  
  static args(value) { return is.args(value); }
  
  static array(value) { return is.array(value); }
  
  static arraylike(value) { return is.arraylike(value); }
  
  static boolean(value) { return is.boolean(value); }
  
  static bool(value) { return is.bool(value); }
  
  static false(value) { return is.false(value); }
  
  static true(value) { return is.true(value); }
  
  static date(value) { return is.date(value); }
  
  static element(value) { return is.element(value); }
  
  static error(value) { return is.error(value); }
  
  static function(value) { return is.function(value); }
  
  static fn(value) { return is.fn(value); }
  
  static number(value) { return is.number(value); }
  
  static infinite(value) { return is.infinite(value); }
  
  static decimal(value) { return is.decimal(value); }
  
  static divisibleBy(value) { return is.divisibleBy(value); }
  
  static int(value) { return is.int(value); }
  
  static integer(value) { return is.integer(value); }
  
  static maximum(value) { return is.maximum(value); }
  
  static minimum(value) { return is.minimum(value); }
  
  static nan(value) { return is.nan(value); }
  
  static even(value) { return is.even(value); }
  
  static odd(value) { return is.odd(value); }
  
  static ge(value) { return is.ge(value); }
  
  static gt(value) { return is.gt(value); }
  
  static le(value) { return is.le(value); }
  
  static lt(value) { return is.lt(value); }
  
  static within(value) { return is.within(value); }
  
  static object(value) { return is.object(value); }
  
  static primitive(value) { return is.primitive(value); }
  
  static hash(value) { return is.hash(value); }
  
  static regexp(value) { return is.regexp(value); }
  
  static string(value) { return is.string(value); }
  
  static base64(value) { return is.base64(value); }
  
  static hex(value) { return is.hex(value); }
  
  static symbol(value) { return is.symbol(value); }
  //endregion
  
  static toString(value) {
    return toString.call(value);
  }
  
  static typeOf(value, type) {
    //if (is.null(value)) return 'null';
    //if (is.undefined(value)) return 'undefined';
    //
    //return is.object(value)
    //  ? toString.call(value).slice(8, -1).toLowerCase()
    //  : value.constructor.name.toLowerCase();
    
    return is.a(value, type) || is.equal(Is.getTypeOf(value), type);
  }
  
  static getTypeOf(value) {
    return Is.toString(value).slice(8, -1).toLowerCase();
  }
  
  static map(value) {
    return Is.typeOf(value, 'map');
  }
  
  static set(value) {
    return Is.typeOf(value, 'set');
  }
  
  static buffer(value) {
    return Buffer.isBuffer(value);
  }
  
}

export {
  Util,
  Is
}

