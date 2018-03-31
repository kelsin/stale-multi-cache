// @flow
// region typing, stripped during compiling
import type { Buffer } from '@types/node';
// endregion

import Promise from 'bluebird';

import { NotFoundError } from 'src/errors/notFound';
import { Util, Is } from 'src/util';

class RedisStore {
    
    /**
     * The string to append to keys to identify values are compressed.
     *
     * Currently supports:
     * - br - brotli compression format
     *
     * Other compressions supports to added later.
     * - gz - gunzip
     *
     * @type {string}
     */
    static COMPRESS_KEY_SUFFIX = 'br';
    
    /* istanbul ignore next */
    static build(client, options) {
        return new RedisStore(client, options);
    }
    
    static getClassName() { return 'RedisStore'; }
    
    getClassName() { return RedisStore.getClassName(); }
    
    get client() {
        return this._client;
    }
    
    get compress() {
        return this._compress;
    }
    
    constructor(client, options = { compress: true }) {
        this._client   = client;
        this._compress = options.compress === true;
    }
    
    get(key) {
        if (this.compress)
            return this.getCompress(key);
    
        const self = this;
        const { client } = self;
        
        return new Promise((resolve, reject) => {
            client.get(key, (err, res) => {
                return err || Is.nil(res) || Is.undef(res)
                    ? reject(NotFoundError.build(key))
                    : resolve(res);
            });
        });
    }
    
    getCompress(key) {
        const self = this;
        const { client } = self;
        
        // append identify to keys to identify compressed values when compress=true
        // br = brotli
        const keyBr = `${key}-${RedisStore.COMPRESS_KEY_SUFFIX}`;
        
        return new Promise(async (resolve, reject) => {
            const pipeline = Util.p_pipe(
                // get key from client
                () => {
                    return new Promise((resolve, reject) => {
                        client.get(keyBr, (err, res) => {
                            return err || Is.nil(res) || Is.undef(res)
                                ? reject(NotFoundError.build(key))
                                : resolve(Buffer.from(res, 'base64'));
                        });
                    })
                },
                // decompress
                (buf:Buffer) => Util.decompress(Buffer.from(buf, 'binary')),
                /* istanbul ignore next  */
                (buf:Buffer) => {
                    return Is.nil(buf) || Is.undef(buf)
                        ? Promise.reject(NotFoundError.build(key))
                        : Promise.resolve(Buffer.from(buf).toString());
                }
            );
            
            const [err, res] = await Util.exec(pipeline());
            
            return err
                ? reject(err)
                : resolve(res);
        })
    }
    
    set(key, value) {
        if (this.compress)
            return this.setCompress(key, value);
        
        return this.client
                   .set(key, value)
                   .then(res => res);
    }
    
    setCompress(key, value) {
        const { client } = this;
        return new Promise(async (resolve, reject) => {
            
            const pipeline = Util.p_pipe(
                /* istanbul ignore next  */
                (buf) => (Is.nil(buf) || Is.undef(buf))
                    ? Promise.reject(new Error(`value for key '${key}' is null or undefined`))
                    : Promise.resolve(buf),
                (buf) => Util.compress(Buffer.from(buf)),
                (buf:Buffer) => client.set(`${key}-br`, buf.toString('base64')),
            );
            
            const [err, res] = await Util.exec(pipeline(value));
            
            /* istanbul ignore next  */
            return err
                ? reject(err)
                : resolve(Buffer.from(res).toString());
        })
    }
}

export default RedisStore;
export {
    RedisStore
}
