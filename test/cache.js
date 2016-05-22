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
var SimpleMemoryStore = require('../src/stores/simple');
var Value = require('../src/value');

describe('Cache', function() {
  describe('#getStores()', function() {
    it('should return [] for the default store list', function() {
      var cache = new Cache();
      return expect(cache.getStores()).to.eql([]);
    });

    it('should return passed in array of stores', function() {
      var stores = [1,2];
      var cache = new Cache(stores);
      return expect(cache.getStores()).to.equal(stores);
    });
  });

  describe('#set()', function() {
    describe('with no stores', function() {
      it('should resolve to the value', function() {
        var cache = new Cache();
        return expect(cache.set('test', 'value')).to.eventually.equal('value');
      });
    });

    describe('with a simple store', function() {
      it('should resolve to the value', function() {
        var store = new SimpleMemoryStore();
        var cache = new Cache(store);
        return expect(cache.set('test', 'value')).to.eventually.equal('value');
      });

      it('should set the key to the value', function() {
        var store = new SimpleMemoryStore();
        var cache = new Cache(store);
        return cache.set('test', 'value').then(function() {
          return expect(cache.get('test')).to.eventually.equal('value');
        });
      });
    });
  });

  describe('#get()', function() {
    describe('with no stores', function() {
      it('should return a not found error', function() {
        var cache = new Cache();
        return expect(cache.get('test')).to.eventually.be.rejected;
      });
    });

    describe('with a NoopStore', function() {
      it('should return a not found error', function() {
        var cache = new Cache(new NoopStore());
        return expect(cache.get('test')).to.eventually.be.rejected;
      });
    });

    describe('with a SimpleMemoryStore', function() {
      it('should return a not found error', function() {
        var store = new SimpleMemoryStore();
        var cache = new Cache(store);
        return expect(cache.get('test')).to.eventually.be.rejected;
      });

      it('should be able to save a value', function () {
        var store = new SimpleMemoryStore();
        var cache = new Cache(store);
        return store.set('test', 'value').then(function() {
          return expect(cache.get('test')).to.eventually.equal('value');
        });
      });
    });

    describe('with a Noop AND Simple Store', function() {
      it('should return a not found error', function() {
        var noop = new NoopStore();
        var simple = new SimpleMemoryStore();
        var cache = new Cache([noop, simple, noop]);
        return expect(cache.get('test')).to.eventually.be.rejected;
      });

      it('should return the value from the simple store', function() {
        var noop = new NoopStore();
        var simple = new SimpleMemoryStore();
        var cache = new Cache([noop, simple, noop]);

        return simple.set('test', 'value').then(function() {
          return expect(cache.get('test')).to.eventually.equal('value');
        });
      });
    });

    describe('with three simple stores', function() {
      it('should set the found value in failed stores', function(done) {
        var simple1 = new SimpleMemoryStore();
        var simple2 = new SimpleMemoryStore();
        var simple3 = new SimpleMemoryStore();
        var cache = new Cache([simple1, simple2, simple3]);

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
            var promises = Promise.all([
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

  describe('#wrap()', function() {
    var number = 0;
    var func = function() {
      var saved = number;
      number = number + 1;
      return saved;
    };
    var spy = sinon.spy(func);

    beforeEach(function() {
      number = 0;
      spy.reset();
    });

    it('should not call the function more than once', function() {
      var store1 = new SimpleMemoryStore();
      var store2 = new SimpleMemoryStore();
      var cache = new Cache([store1, store2]);

      var cached = function() {
        return cache.wrap('test', spy, 300);
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

    it('should refresh the cache in the background', function(done) {
      var store1 = new SimpleMemoryStore();
      var store2 = new SimpleMemoryStore();
      var cache = new Cache([store1, store2]);

      var cached = function() {
        return cache.wrap('test', spy, 0);
      };

      return cached().then(function(value) {
        expect(value).to.equal(0);
        return cached();
      }).then(function(value) {
        expect(value).to.equal(0);
        expect(spy.callCount).to.equal(1);

        // Now the fancy part... wait until next tick and make sure it calls the function again
        process.nextTick(function() {
          cached().then(function(value) {
            expect(value).to.equal(1); // Third call and the value is only upped once
            expect(spy.callCount).to.equal(2); // We've called cached three times

            // We just called cached() again which will trigger another update
            // Let's make sure the data in the cache is now accurate
            process.nextTick(function() {
              cache.lastPromise.then(function() {
                store2.get('test').then(function(value) {
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
      var store1 = new SimpleMemoryStore();
      var store2 = new SimpleMemoryStore();
      var cache = new Cache([store1, store2]);

      var cached = function() {
        return cache.wrap('test', spy, 0);
      };

      var app = express();
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
  });
});
