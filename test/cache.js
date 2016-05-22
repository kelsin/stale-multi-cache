var chai = require('chai');
chai.use(require('chai-as-promised'));
var expect = chai.expect;

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
});
