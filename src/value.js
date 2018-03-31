// Object that stores data in cache stores
import moment from 'moment';
import parse from 'fast-json-parse';

import { Is } from './util';

class Value {
    
    static build(value, created) {
        return new Value(value, created)
    }
    
    constructor(value, created) {
        this.value     = value;
        this.created   = created || moment();
        this.staleTTL  = undefined;
        this.staleAt   = undefined;
        this.expireTTL = undefined;
        this.expireAt  = undefined;
    }
    
    get() {
        return this.value;
    }
    
    getCreated() {
        return this.created;
    }
    
    getExpireTTL() {
        return this.expireTTL;
    }
    
    getExpireAt() {
        return this.expireAt;
    }
    
    getStaleTTL() {
        return this.staleTTL;
    }
    
    getStaleAt() {
        return this.staleAt;
    }
    
    getMaxAge() {
        let end = this.staleAt;
        if (Is.undef(end)) {
            end = this.expireAt;
        }
        
        if (end) {
            let diff = end.diff(moment(), 'seconds');
            return Math.max(0, diff);
        } else {
            return 0;
        }
    }
    
    getCacheControl() {
        let maxAge = this.getMaxAge();
        if (maxAge > 0) {
            return `public, max-age=${maxAge}`;
        } else {
            return 'no-cache, no-store, must-revalidate';
        }
    }
    
    set(value) {
        this.value = value;
    }
    
    setExpireTTL(expireTTL) {
        this.expireTTL = expireTTL;
        this.expireAt  = Is.undef(expireTTL)
            ? undefined
            : moment(this.created)
                .add(expireTTL, 'seconds');
    }
    
    setStaleTTL(staleTTL) {
        this.staleTTL = staleTTL;
        this.staleAt  = Is.undef(staleTTL)
            ? undefined
            : moment(this.created)
                .add(staleTTL, 'seconds');
    }
    
    expired() {
        if (Is.undef(this.expireAt)) {
            return false;
        } else {
            return moment()
                .isSameOrAfter(this.expireAt);
        }
    }
    
    stale() {
        if (Is.undef(this.staleAt)) {
            return false;
        } else {
            return moment()
                .isSameOrAfter(this.staleAt);
        }
    }
    
    toJSON() {
        return {
            value: this.value,
            created: this.getCreated(),
            staleTTL: this.getStaleTTL(),
            expireTTL: this.getExpireTTL()
        };
    }
    
    /* istanbul ignore next */
    toString() {
        return JSON.stringify(this.get(), null, 2);
    }
    
    static fromJSON(json) {
        const result = parse(json);
        
        /* istanbul ignore next */
        if (result.err)
            throw new Error(`unable to parse json: ${result.err.message}`);
        
        const parsed = result.value;
        const value  = new Value(parsed.value, moment(parsed.created));
        value.setStaleTTL(parsed.staleTTL);
        value.setExpireTTL(parsed.expireTTL);
        
        return value;
    }
}

export default Value;
export {
    Value
}
