var chai = require('chai');
chai.use(require('chai-as-promised'));
var expect = chai.expect;

var LRUMemoryStore = require('../../src/stores/lru');

describe('LRUMemoryStore', function() {
  describe('#get()', function() {
    it('should return a rejected promise for an unknown value', function() {
      var store = new LRUMemoryStore();
      return expect(store.get('test')).to.eventually.be.rejected;
    });
  });

  describe('#set()', function() {
    it('should return a resolved promise for a set value', function() {
      var store = new LRUMemoryStore();

      expect(store.set('test', 'value')).to.eventually.equal('value');
      return expect(store.get('test')).to.eventually.equal('value');
    });
  });

  describe('with a max set to 1', function() {
    it('should overright previous values', function() {
      var store = new LRUMemoryStore({max: 1});

      expect(store.set('test1', 'value1')).to.eventually.equal('value1');
      expect(store.get('test1')).to.eventually.equal('value1');

      // Adding in a second value should bump the first
      expect(store.set('test2', 'value2')).to.eventually.equal('value2');
      expect(store.get('test1')).to.eventually.be.rejected;
      return expect(store.get('test2')).to.eventually.equal('value2');
    });
  });
});
