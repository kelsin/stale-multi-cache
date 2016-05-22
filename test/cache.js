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
        expect(cache.set('test', 'value')).to.eventually.equal('value');
        return expect(cache.get('test')).to.eventually.equal('value');
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
        expect(cache.get('test')).to.eventually.be.rejected;
        store.set('test', new Value('value'));
        return expect(cache.get('test')).to.eventually.equal('value');
      });
    });

    describe('with a Noop AND Simple Store', function() {
      it('should return the value from the simple store', function() {
        var noop = new NoopStore();
        var simple = new SimpleMemoryStore();
        var cache = new Cache([noop, simple, noop]);

        expect(cache.get('test')).to.eventually.be.rejected;
        simple.set('test', new Value('value'));
        return expect(cache.get('test')).to.eventually.equal('value');
      });
    });

    describe('with two Simple stores', function() {
      it('should populate stores already searched with the data when found', function() {
        var simple1 = new SimpleMemoryStore();
        var simple2 = new SimpleMemoryStore();
        var simple3 = new SimpleMemoryStore();

        var cache = new Cache([simple1, simple2, simple3]);
        expect(cache.get('test')).to.eventually.be.rejected;

        simple2.set('test', new Value('value'));
        expect(simple1.get('test')).to.eventually.be.rejected;
        expect(simple2.get('test')).to.eventually.be.resolved;
        expect(simple3.get('test')).to.eventually.be.rejected;

        expect(cache.get('test')).to.eventually.equal('value');

        expect(simple1.get('test')).to.eventually.be.resolved;
        expect(simple2.get('test')).to.eventually.be.resolved;
        return expect(simple3.get('test')).to.eventually.be.rejected;
      });
    });
  });
});
