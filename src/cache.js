// @flow
import type { Buffer } from '@types/node';

// Main Cache Interface
import Promise from 'bluebird';
import stringify from 'fast-safe-stringify';
import hash from 'object-hash';

import _ from 'lodash';
import { Logger } from 'src/logger';
import { NotFoundError } from 'src/errors/notFound';
import { Util } from 'src/util';
import { Value } from 'src/value';

class CacheUtil {
// Sets a value in all stores, no manipulation of value at all
    static multiSet(stores, key, value) {
        return Promise.map(stores, store => store.set(key, value))
                      .then(() => value)
                      .catch(err => {
                          Logger.error(err);
                          return value;
                      });
    }
    
    static processSearchResult(search) {
        // If we found it, return
        if (search.found) {
            return search.value;
        }
        // Otherwise throw a not found
        throw new NotFoundError(search.key);
    }
    
    static addContent(cache, content, encoding) {
        if (Buffer.isBuffer(content)) {
            const oldContent = Buffer.from(cache.content || '');
            cache.content    = Buffer.concat([oldContent, content], oldContent.length + content.length);
        } else {
            if (typeof content !== "undefined") {
                cache.content = (cache.content || '') + content;
            }
        }
        cache.encoding = encoding || cache.encoding;
    }
}

/**
 * A cache object
 *
 * Takes in an array of stores and a hash of options
 **/
class Cache {
    
    static get DEFAULT_OPTIONS() {
        return Util.clone({
            name: 'default',
            bypassHeader: 'cache-bypass',
            statusHeader: 'cache-status',
            includeMethods: ['GET'],
            debug: false
        })
    }
    
    static getClassName() { return 'Cache'; }
    
    getClassName() { return Cache.getClassName(); }
    
    get options() {
        return this._options;
    }
    
    get logger() {
        return Object.freeze(this._logger);
    }
    
    get stores() {
        return this._stores;
    }
    
    constructor(stores = [], options = {}) {
        if (!(stores instanceof Array)) {
            stores = [stores];
        }
        
        this._stores  = stores;
        this._options = Object.assign({},
            Cache.DEFAULT_OPTIONS,
            options);
        
        this._logger = Logger;
    }
    
    // Returns the list of stores
    getStores() {
        return this.stores;
    }
    
    // A key generator based on [object-hash](https://github.com/puleos/object-hash)
    getKey(obj = {}) {
        return `${this.options.name}:cache:${hash(obj)}`;
    }
    
    set(key, value) {
        return CacheUtil.multiSet(this.stores, key, value);
    }
    
    // Returns raw data out of the stores, repopulating stores that don't have the
    // data from ones that do.
    get(key) {
        let self = this;
        
        // Accumulator object
        let search = {
            found: false,
            stores: [],
            key
        };
        
        return Promise.reduce(
            this.stores,
            (search, store) => {
                // If we've found the item already, just return
                if (search.found) {
                    return search;
                }
                
                // Otherwise check this store
                return store
                .get(key)
                .then(value => {
                    // After this function returns,
                    // set this value in the failed stores
                    process.nextTick(() => {
                        self.lastPromise = CacheUtil.multiSet(search.stores, key, value);
                    });
                    
                    // We found it!
                    search.found = true;
                    search.value = value;

                    return search;
                    
                })
                .catch(NotFoundError, () => {
                    // Item not found, just keep looking
                    search.stores.push(store);
                    return search;
                })
                .catch(err => {
                    // Error! Log it, and then keep looking
                    self.logger.error(err);
                    search.stores.push(store);
                    return search;
                });
                }, search).then(CacheUtil.processSearchResult);
    }
    
    // Puts the raw data into a Value object and then sets it in the stores
    createValueAndMultiSet(key, data, opts = {}) {
        let value = new Value(data);
        
        opts = Object.assign({}, this.options, opts);
        
        value.setStaleTTL(opts.staleTTL);
        value.setExpireTTL(opts.expireTTL);
        
        return CacheUtil.multiSet(this.stores, key, stringify(value))
                        .then(() => value);
    }
    
    // Calls the function, storing the response
    refresh(key, func, options = {}) {
        let self = this;
        return Promise.try(func)
                      .then(data => self.createValueAndMultiSet(key, data, options))
                      .then(value => value.get());
    }
    
    // Wraps a function with the caching handling stale and expired states correctly
    wrap(key, func, options = {}) {
        let self = this;
        
        key = self.getKey(key);
        // First try and get the key
        return self
        .get(key)
        .then(raw => {
            let value = Value.fromJSON(raw);
            
            if (value.expired()) {
                // Expire values wait for us to get them again, throwing errors
                return self.refresh(key, func, options);
                
            } else if (value.stale()) {
                // Stale values update on next tick
                process.nextTick(() => {
                    self.lastPromise = Promise.try(func)
                                              .then(data => self.createValueAndMultiSet(key, data, options))
                                              .catch(err => {
                                                  // Error getting new value... do nothing
                                              });
                });
            }
            
            // As long as not expired, return it!
            if (self.options.debug) {
                return Object.assign({
                    _cache: {
                        key,
                        created: value.getCreated(),
                        staleTTL: value.getStaleTTL(),
                        staleAt: value.getStaleAt(),
                        expireTTL: value.getExpireTTL(),
                        expireAt: value.getExpireAt(),
                    }
                }, value.get());
            }
            
            return value.get();
        })
        .catch(err => // We couldn't find the value in the cache.
            // Run the function and then set it
            self.refresh(key, func, options));
    }
    
    // A connect middleware that supports stale and expired correctly
    middleware(opts = {}) {
        let self = this;
        opts     = Object.assign({}, this.options, opts);
        
        return (req, res, next) => {
            // Bypass if we supplied header
            if (req.headers[opts.bypassHeader]) {
                res.setHeader(opts.statusHeader, 'bypass');
                return next();
            }
            
            if (!opts.includeMethods.includes(req.method)) {
                res.setHeader(opts.statusHeader, 'skipMethod');
                return next();
            }
            
            let key = self.getKey({ url: req.originalUrl });
            
            res._cache = {
                write: res.write.bind(res),
                end: res.end.bind(res),
                getHeader: res.getHeader.bind(res),
                removeHeader: res.removeHeader.bind(res),
                setHeader: res.setHeader.bind(res),
                encoding: undefined,
                content: undefined,
                headers: [],
                stale: false,
                expired: false
            };
            
            return self.get(key)
                       .then(raw => {
                           let value = Value.fromJSON(raw);
                
                           if (value.expired()) {
                               res._cache.expired = true;
                               throw new Error("Value expired");
                           }
                
                           let cached = value.get();
                
                           let data = cached.content;
                           if (typeof data !== "string" && data) {
                               data = Buffer.from(data.data);
                           }
                
                           _.forEach(cached.headers, ([name, value]) => res.setHeader(name, value));
                           res.setHeader('Cache-Control', value.getCacheControl());
                           res.setHeader(opts.statusHeader, 'cached');
                           res.writeHead(cached.status);
                           res.end(data);
                
                           if (value.stale()) {
                               res._cache.stale = true;
                               throw new Error("Value stale");
                           }
                
                       })
                       .catch(err => {
                           res.getHeader = name => {
                               let header = _.find(res._cache.headers,
                                   ([key, value]) => key === name);
                    
                               if (header) {
                                   return header[1];
                               }
                           };
                
                           res.removeHeader = name => {
                               res._cache.headers = _.filter(res._cache.headers,
                                   ([key, value]) => key !== name);
                           };
                
                           res.setHeader = (name, value) => {
                               res.removeHeader(name);
                               res._cache.headers.push([name, value]);
                           };
                
                           // patch res.write
                           res.write = (content, encoding) => {
                               CacheUtil.addContent(res._cache, content, encoding);
                           };
                
                           // patch res.end
                           res.end = (content, encoding) => {
                               CacheUtil.addContent(res._cache, content, encoding);
                    
                               // Save the content and headers
                               let data = Object.assign({}, {
                                   content: res._cache.content,
                                   headers: res._cache.headers,
                                   status: res.statusCode
                               });
                    
                               return self.createValueAndMultiSet(key, data, opts)
                                          .then(function (value) {
                                              if (!res._cache.stale) {
                                                  _.forEach(res._cache.headers, args => {
                                                      res._cache.setHeader.apply(res, args);
                                                  });
                            
                                                  res._cache.setHeader.apply(res, ['Cache-Control', value.getCacheControl()]);
                            
                                                  // Add Status Header
                                                  res._cache.setHeader.apply(res, [opts.statusHeader, res._cache.expired ? 'expired' : 'miss']);
                            
                                                  if (typeof res._cache.content !== "undefined") {
                                                      res._cache.write.apply(res, [res._cache.content, res._cache.encoding]);
                                                  }
                                                  return res._cache.end.apply(this);
                                              }
                                          });
                           };
                
                           return next();
                       });
        };
    }
}

export default Cache;
export {
    Cache,
    CacheUtil
}
