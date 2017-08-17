var chai = require('chai');
chai.use(require('chai-as-promised'));
var expect = chai.expect;
var sinon = require('sinon');

// Express App Testing
var request = require('supertest');
var express = require('express');

var Promise = require('bluebird');
var Cache = require('../src/cache');
var NoopStore = require('../src/stores/noop');
var ErrorStore = require('../src/stores/error');
var SimpleMemoryStore = require('../src/stores/simple');
var Value = require('../src/value');

describe('Cache', function() {
  describe('#getStores()', function() {
    it('should return [] for the default store list', function() {
      let cache = new Cache();
      return expect(cache.getStores()).to.eql([]);
    });

    it('should return passed in array of stores', function() {
      let stores = [1,2];
      let cache = new Cache(stores);
      return expect(cache.getStores()).to.equal(stores);
    });
  });

  describe('#getKey()', function() {
    it('should generate a identical key for different objects that are the same', function() {
      let cache = new Cache();
      let obj1 = { a: 1, b: 2 };
      let obj2 = { b: 2, a: 1 };
      let obj3 = { a: 2, b: 1 };

      expect(cache.getKey(obj1)).to.equal(cache.getKey(obj2));
      expect(cache.getKey(obj1)).to.not.equal(cache.getKey(obj3));
      expect(cache.getKey(obj2)).to.not.equal(cache.getKey(obj3));
      expect(cache.getKey(obj1)).to.include('default:cache:');
    });

    it('should allow for custom hash names', function() {
      let cache = new Cache([], { name: 'custom' });
      let obj = { a: 1, b: 2 };

      expect(cache.getKey(obj)).to.include('custom:cache:');
    });
  });

  describe('#set()', function() {
    describe('with no stores', function() {
      it('should resolve to the value', function() {
        let cache = new Cache();
        return expect(cache.set('test', 'value')).to.eventually.equal('value');
      });
    });

    describe('with a simple store', function() {
      it('should resolve to the value', function() {
        let store = new SimpleMemoryStore();
        let cache = new Cache(store);
        return expect(cache.set('test', 'value')).to.eventually.equal('value');
      });

      it('should set the key to the value', function() {
        let store = new SimpleMemoryStore();
        let cache = new Cache(store);
        return cache.set('test', 'value').then(function() {
          return expect(cache.get('test')).to.eventually.equal('value');
        });
      });
    });
  });

  describe('#get()', function() {
    describe('with no stores', function() {
      it('should return a not found error', function() {
        let cache = new Cache();
        return expect(cache.get('test')).to.eventually.be.rejected;
      });
    });

    describe('with a NoopStore', function() {
      it('should return a not found error', function() {
        let cache = new Cache(new NoopStore());
        return expect(cache.get('test')).to.eventually.be.rejected;
      });
    });

    describe('with a SimpleMemoryStore', function() {
      it('should return a not found error', function() {
        let store = new SimpleMemoryStore();
        let cache = new Cache(store);
        return expect(cache.get('test')).to.eventually.be.rejected;
      });

      it('should be able to save a value', function () {
        let store = new SimpleMemoryStore();
        let cache = new Cache(store);
        return store.set('test', 'value').then(function() {
          return expect(cache.get('test')).to.eventually.equal('value');
        });
      });
    });

    describe('with a Noop AND Simple Store', function() {
      it('should return a not found error', function() {
        let noop = new NoopStore();
        let simple = new SimpleMemoryStore();
        let cache = new Cache([noop, simple, noop]);
        return expect(cache.get('test')).to.eventually.be.rejected;
      });

      it('should return the value from the simple store', function() {
        let noop = new NoopStore();
        let simple = new SimpleMemoryStore();
        let cache = new Cache([noop, simple, noop]);

        return simple.set('test', 'value').then(function() {
          return expect(cache.get('test')).to.eventually.equal('value');
        });
      });
    });

    describe('with three simple stores', function() {
      it('should set the found value in failed stores', function(done) {
        let simple1 = new SimpleMemoryStore();
        let simple2 = new SimpleMemoryStore();
        let simple3 = new SimpleMemoryStore();
        let cache = new Cache([simple1, simple2, simple3]);

        // Set our value in the middle store
        simple2.set('test', 'value').then(function() {
          // Verify that we're good
          return Promise.all([
            expect(simple1.get('test')).to.eventually.be.rejected,
            expect(simple2.get('test')).to.eventually.equal('value'),
            expect(simple3.get('test')).to.eventually.be.rejected,
          ]);
        }).then(function() {
          // Now get that value out of the cache
          return cache.get('test');
        }).then(function(value) {
          expect(value).to.equal('value');

          // Right now nothing should have changed
          return Promise.all([
            expect(simple1.get('test')).to.eventually.be.rejected,
            expect(simple2.get('test')).to.eventually.equal('value'),
            expect(simple3.get('test')).to.eventually.be.rejected,
          ]);
        }).then(function() {

          // Have to wait for next tick for this to happen
          process.nextTick(function() {
            cache.lastPromise.then(function() {
              let promises = Promise.all([
                expect(simple1.get('test')).to.eventually.equal('value'),
                expect(simple2.get('test')).to.eventually.equal('value'),
                expect(simple3.get('test')).to.eventually.be.rejected
              ]);

              expect(promises).to.eventually.be.fulfilled.notify(done);
            });
          });
        });
      });
    });
  });

  describe('#wrap()', function() {
    let number = 0;
    let func = function() {
      let saved = number;
      number = number + 1;
      return saved;
    };
    let spy = sinon.spy(func);

    beforeEach(function() {
      number = 0;
      spy.reset();
    });

    it('should not call the function more than once', function() {
      let store1 = new SimpleMemoryStore();
      let store2 = new SimpleMemoryStore();
      let cache = new Cache([store1, store2]);

      let cached = function() {
        return cache.wrap('test', spy, { staleTTL: 300 });
      };

      return cached().then(function(value) {
        expect(value).to.equal(0);
        return cached();
      }).then(function(value) {
        expect(value).to.equal(0);
        return cached();
      }).then(function(value) {
        expect(value).to.equal(0);
        return expect(spy.callCount).to.equal(1);
      });
    });

    it('should not call the function more than once with default staleTTL', function() {
      let store1 = new SimpleMemoryStore();
      let store2 = new SimpleMemoryStore();
      let cache = new Cache([store1, store2], { staleTTL: 300 });

      let cached = function() {
        return cache.wrap('test', spy);
      };

      return cached().then(function(value) {
        expect(value).to.equal(0);
        return cached();
      }).then(function(value) {
        expect(value).to.equal(0);
        return cached();
      }).then(function(value) {
        expect(value).to.equal(0);
        return expect(spy.callCount).to.equal(1);
      });
    });

    it('expired values should be refreshed immediately', function() {
      let store1 = new SimpleMemoryStore();
      let store2 = new SimpleMemoryStore();
      let cache = new Cache([store1, store2]);

      let cached = function() {
        return cache.wrap('test', spy, { expireTTL: 0 });
      };

      return cached()
        .then(function(value) {
          expect(value).to.equal(0);
          expect(spy.callCount).to.equal(1);
        })
        .then(cached)
        .then(function(value) {
          expect(value).to.equal(1);
          expect(spy.callCount).to.equal(2);
        })
        .then(cached)
        .then(function(value) {
          expect(value).to.equal(2);
          expect(spy.callCount).to.equal(3);
        });
    });

    it('expired values should be refreshed immediately with default expireTTL', function() {
      let store1 = new SimpleMemoryStore();
      let store2 = new SimpleMemoryStore();
      let cache = new Cache([store1, store2], { expireTTL: 0 });

      let cached = function() {
        return cache.wrap('test', spy);
      };

      return cached()
        .then(function(value) {
          expect(value).to.equal(0);
          expect(spy.callCount).to.equal(1);
        })
        .then(cached)
        .then(function(value) {
          expect(value).to.equal(1);
          expect(spy.callCount).to.equal(2);
        })
        .then(cached)
        .then(function(value) {
          expect(value).to.equal(2);
          expect(spy.callCount).to.equal(3);
        });
    });

    it('should be ok if sets fail', function() {
      let store1 = new NoopStore();
      let store2 = new ErrorStore();
      let cache = new Cache([store1, store2]);

      let cached = function() {
        return cache.wrap('test', spy, { expireTTL: 0 });
      };

      return cached()
        .then(function(value) {
          expect(value).to.equal(0);
          expect(spy.callCount).to.equal(1);
        })
        .then(cached)
        .then(function(value) {
          expect(value).to.equal(1);
          expect(spy.callCount).to.equal(2);
        })
        .then(cached)
        .then(function(value) {
          expect(value).to.equal(2);
          expect(spy.callCount).to.equal(3);
        });
    });

    it('should refresh any stale cache in the background', function(done) {
      let store1 = new SimpleMemoryStore();
      let store2 = new SimpleMemoryStore();
      let cache = new Cache([store1, store2]);
      let key = cache.getKey('test');

      let cached = function() {
        return cache.wrap('test', spy, { staleTTL: 0 });
      };

      return cached().then(function(value) {
        expect(value).to.equal(0);
        expect(spy.callCount).to.equal(1);
        return cached();
      }).then(function(value) {
        expect(value).to.equal(0);
        expect(spy.callCount).to.equal(1);

        // Now the fancy part... wait until next tick and make sure it calls the function again
        process.nextTick(function() {
          cache.lastPromise.then(function() {
            return cached();
          }).then(function(value) {
            expect(value).to.equal(1); // Third call and the value is only upped once
            expect(spy.callCount).to.equal(2); // We've called cached three times

            // We just called cached() again which will trigger another update
            // Let's make sure the data in the cache is now accurate
            process.nextTick(function() {
              cache.lastPromise.then(function() {
                store2.get(key).then(function(raw) {
                  let value = Value.fromJSON(raw);
                  expect(value.get()).to.equal(2); // Yep!
                  return done();
                });
              });
            });
          });
        });
      });
    });

    it('should work in an express app', function(done) {
      let store1 = new SimpleMemoryStore();
      let store2 = new SimpleMemoryStore();
      let cache = new Cache([store1, store2]);

      let cached = function() {
        return cache.wrap('test', spy, { staleTTL: 0 });
      };

      let app = express();
      app.get('/', function(req, res) {
        cached().then(function(value) {
          res.status(200).json({value: value});
        });
      });

      request(app)
        .get('/')
        .expect(200, {value:0}) // initial value
        .end(function(err, res) {
          if (err) return done(err);

          expect(spy.callCount).to.equal(1);

          // This time should return 0 but call the update
          return request(app)
            .get('/')
            .expect(200, {value:0}) // ensure cached
            .end(function(err, res) {
              if (err) return done(err);

              expect(spy.callCount).to.equal(2);

              // This last time should return 1 but call the update
              return request(app)
                .get('/')
                .expect(200, {value:1})
                .end(function(err, res) {
                  if (err) return done(err);

                  expect(spy.callCount).to.equal(3);

                  return done();
                });
            });
        });
    });

    it('should work in an express app when the function errors', function(done) {
      let store1 = new SimpleMemoryStore();
      let store2 = new SimpleMemoryStore();
      let cache = new Cache([store1, store2]);
      let stub = sinon.stub();
      stub.onFirstCall().returns('first');
      stub.throws();

      let cached = function() {
        return cache.wrap('test', stub, { staleTTL: 0 });
      };

      let app = express();
      app.get('/', function(req, res) {
        cached().then(function(value) {
          res.status(200).json({value: value});
        });
      });

      request(app)
        .get('/')
        .expect(200, {value:'first'}) // initial value
        .end(function(err, res) {
          if (err) return done(err);

          expect(stub.callCount).to.equal(1);

          // This time should return 'first' again
          return request(app)
            .get('/')
            .expect(200, {value:'first'}) // ensure cached
            .end(function(err, res) {
              if (err) return done(err);

              expect(stub.callCount).to.equal(2);

              // This last time should return 'first' AGAIN
              return request(app)
                .get('/')
                .expect(200, {value:'first'})
                .end(function(err, res) {
                  if (err) return done(err);

                  expect(stub.callCount).to.equal(3);

                  return done();
                });
            });
        });
    });
  });

  describe("#middleware", function() {
    let number = 0;
    let func = function() {
      let saved = number;
      number = number + 1;
      return saved;
    };
    let spy = sinon.spy(func);

    beforeEach(function() {
      number = 0;
      spy.reset();
    });

    it('should work in an express app', function(done) {
      let store1 = new SimpleMemoryStore();
      let store2 = new SimpleMemoryStore();
      let cache = new Cache([store1, store2], { staleTTL: 300 });

      let app = express();
      app.use(cache.middleware());
      app.get('/', function(req, res) {
        return res.status(200).json({value: spy()});
      });

      request(app)
        .get('/')
        .expect(200, {value:0}) // initial value
        .end(function(err, res) {
          if (err) return done(err);

          expect(spy.callCount).to.equal(1);

          // This time should return the cache
          return request(app)
            .get('/')
            .expect(200, {value:0}) // ensure cached
            .end(function(err, res) {
              if (err) return done(err);

              expect(spy.callCount).to.equal(1);

              // This last time should return the cache again
              return request(app)
                .get('/')
                .expect(200, {value:0})
                .end(function(err, res) {
                  if (err) return done(err);

                  expect(spy.callCount).to.equal(1);

                  return done();
                });
            });
        });
    });

    it('should work in an express app with non-200 status', function(done) {
      let store1 = new SimpleMemoryStore();
      let store2 = new SimpleMemoryStore();
      let cache = new Cache([store1, store2], { staleTTL: 300 });

      let app = express();
      app.use(cache.middleware());
      app.get('/', function(req, res) {
        return res.status(404).json({value: spy()});
      });

      request(app)
        .get('/')
        .expect(404, {value:0}) // initial value
        .end(function(err, res) {
          if (err) return done(err);

          expect(spy.callCount).to.equal(1);

          // This time should return the cache
          return request(app)
            .get('/')
            .expect(404, {value:0}) // ensure cached
            .end(function(err, res) {
              if (err) return done(err);

              expect(spy.callCount).to.equal(1);

              // This last time should return the cache again
              return request(app)
                .get('/')
                .expect(404, {value:0})
                .end(function(err, res) {
                  if (err) return done(err);

                  expect(spy.callCount).to.equal(1);

                  return done();
                });
            });
        });
    });

    it('should work in an express app with headers', function(done) {
      let store1 = new SimpleMemoryStore();
      let store2 = new SimpleMemoryStore();
      let cache = new Cache([store1, store2], { staleTTL: 300 });

      let app = express();
      app.use(cache.middleware());
      app.get('/', function(req, res) {
        res.set('custom-header', spy() + '');
        return res.status(200).json({value: spy()});
      });

      request(app)
        .get('/')
        .expect('custom-header', '0')
        .expect(200, {value:1}) // initial value
        .end(function(err, res) {
          if (err) return done(err);

          expect(spy.callCount).to.equal(2);

          // This time should return the cache
          return request(app)
            .get('/')
            .expect('custom-header', '0')
            .expect(200, {value:1}) // ensure cached
            .end(function(err, res) {
              if (err) return done(err);

              expect(spy.callCount).to.equal(2);

              // This last time should return the cache again
              return request(app)
                .get('/')
                .expect('custom-header', '0')
                .expect(200, {value:1})
                .end(function(err, res) {
                  if (err) return done(err);

                  expect(spy.callCount).to.equal(2);

                  return done();
                });
            });
        });
    });

    it('should work in an express app with no content', function(done) {
      let store1 = new SimpleMemoryStore();
      let store2 = new SimpleMemoryStore();
      let cache = new Cache([store1, store2], { staleTTL: 300 });

      let app = express();
      app.use(cache.middleware());
      app.get('/', function(req, res) {
        return res.end();
      });

      request(app)
        .get('/')
        .expect(200)
        .end(function(err, res) {
          if (err) return done(err);

          return request(app)
            .get('/')
            .expect(200)
            .end(done);
        });
    });

    it('should work in an express app with strings', function(done) {
      let store1 = new SimpleMemoryStore();
      let store2 = new SimpleMemoryStore();
      let cache = new Cache([store1, store2], { staleTTL: 0 });

      let app = express();
      app.use(cache.middleware());
      app.get('/', function(req, res) {
        res.write(spy() + ' ');
        return res.end(spy() + '');
      });

      request(app)
        .get('/')
        .expect(200, '0 1')
        .end(function(err, res) {
          if (err) return done(err);

          return request(app)
            .get('/')
            .expect(200, '0 1')
            .end(function(err, res) {
              if (err) return done(err);

              return request(app)
                .get('/')
                .expect(200, '2 3')
                .end(function(err, res) {
                  if (err) return done(err);

                  return request(app)
                    .get('/')
                    .set('cache-bypass', 'true')
                    .expect(200, '6 7') // Skips the current stale cache of 4 5
                    .end(done);
                });
            });
        });
    });

    it('should work in an express app with Buffers', function(done) {
      let store1 = new SimpleMemoryStore();
      let store2 = new SimpleMemoryStore();
      let cache = new Cache([store1, store2], { staleTTL: 300 });

      let app = express();
      app.use(cache.middleware());
      app.get('/', function(req, res) {
        res.write(Buffer.from(spy() + ' '));
        return res.end(Buffer.from(spy() + ''));
      });

      request(app)
        .get('/')
        .expect(200, '0 1')
        .end(function(err, res) {
          if (err) return done(err);

          return request(app)
            .get('/')
            .expect(200, '0 1')
            .end(function(err, res) {
              if (err) return done(err);

              return request(app)
                .get('/')
                .set('cache-bypass', 'true')
                .expect(200, '2 3')
                .end(done);
            });
        });
    });

    it('should work in an express app with stale data', function(done) {
      let store1 = new SimpleMemoryStore();
      let store2 = new SimpleMemoryStore();
      let cache = new Cache([store1, store2], { staleTTL: 0 });

      let app = express();
      app.use(cache.middleware());
      app.get('/', function(req, res) {
        return res.status(200).json({value: spy()});
      });

      request(app)
        .get('/')
        .expect(200, {value:0}) // initial value
        .end(function(err, res) {
          if (err) return done(err);

          expect(spy.callCount).to.equal(1);

          // This time should return the cache
          return request(app)
            .get('/')
            .expect(200, {value:0}) // ensure cached
            .end(function(err, res) {
              if (err) return done(err);

              expect(spy.callCount).to.equal(2);

              // This last time should return the old cache
              return request(app)
                .get('/')
                .expect(200, {value:1})
                .end(function(err, res) {
                  if (err) return done(err);

                  expect(spy.callCount).to.equal(3);

                  return done();
                });
            });
        });
    });

    it('should work in an express app with bypass', function(done) {
      let store1 = new SimpleMemoryStore();
      let store2 = new SimpleMemoryStore();
      let cache = new Cache([store1, store2], { staleTTL: 300 });

      let app = express();
      app.use(cache.middleware());
      app.get('/', function(req, res) {
        return res.status(200).json({value: spy()});
      });

      request(app)
        .get('/')
        .set('cache-bypass', 'true')
        .expect(200, {value:0}) // initial value
        .end(function(err, res) {
          if (err) return done(err);

          expect(spy.callCount).to.equal(1);

          // This time should return the cache
          return request(app)
            .get('/')
            .set('cache-bypass', 'true')
            .expect(200, {value:1}) // ensure cached
            .end(function(err, res) {
              if (err) return done(err);

              expect(spy.callCount).to.equal(2);

              // This last time should return the cache again
              return request(app)
                .get('/')
                .set('cache-bypass', 'true')
                .expect(200, {value:2})
                .end(function(err, res) {
                  if (err) return done(err);

                  expect(spy.callCount).to.equal(3);

                  return done();
                });
            });
        });
    });

    it('should work in an express app with expired data', function(done) {
      let store1 = new SimpleMemoryStore();
      let store2 = new SimpleMemoryStore();
      let cache = new Cache([store1, store2], { expireTTL: 0 });

      let app = express();
      app.use(cache.middleware());
      app.get('/', function(req, res) {
        return res.status(200).json({value: spy()});
      });

      request(app)
        .get('/')
        .expect(200, {value:0}) // initial value
        .end(function(err, res) {
          if (err) return done(err);

          expect(spy.callCount).to.equal(1);

          // This time should return the cache
          return request(app)
            .get('/')
            .expect(200, {value:1}) // ensure cached
            .end(function(err, res) {
              if (err) return done(err);

              expect(spy.callCount).to.equal(2);

              // This last time should return the cache again
              return request(app)
                .get('/')
                .expect(200, {value:2})
                .end(function(err, res) {
                  if (err) return done(err);

                  expect(spy.callCount).to.equal(3);

                  return done();
                });
            });
        });
    });
  });
});
