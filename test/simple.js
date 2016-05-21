var chai = require('chai');
chai.use(require('chai-as-promised'));
var expect = chai.expect;

var SimpleMemoryStore = require('../src/stores/simple');

describe('SimpleMemoryStore', function() {
  describe('#get()', function() {
    it('should return a rejected promise for an unknown value', function() {
      var store = new SimpleMemoryStore();
      return expect(store.get('test')).to.eventually.be.rejected;
    });
  });

  describe('#set()', function() {
    it('should return a resolved promise for a set value', function() {
      var store = new SimpleMemoryStore();

      expect(store.set('test', 'value')).to.eventually.equal('value');
      return expect(store.get('test')).to.eventually.equal('value');
    });
  });
});
