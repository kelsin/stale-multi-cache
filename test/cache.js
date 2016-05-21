var chai = require('chai');
chai.use(require('chai-as-promised'));
var expect = chai.expect;

var Cache = require('../src/cache');

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
});
