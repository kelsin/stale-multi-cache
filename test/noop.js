var chai = require('chai');
chai.use(require('chai-as-promised'));
var expect = chai.expect;

var NoopStore = require('../src/stores/noop');

describe('NoopStore', function() {
  describe('#get()', function() {
    it('should return a rejected promise', function() {
      var store = new NoopStore();
      return expect(store.get('test')).to.eventually.be.rejected;
    });
  });

  describe('#set()', function() {
    it('should return a rejected promise for a set value', function() {
      var store = new NoopStore();

      expect(store.set('test', 'value')).to.eventually.equal('value');
      return expect(store.get('test')).to.eventually.be.rejected;
    });
  });
});
