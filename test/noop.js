var chai = require('chai');
chai.use(require('chai-as-promised'));
var expect = chai.expect;

var Promise = require('bluebird');
var NoopStore = require('../src/stores/noop');
var NotFoundError = require('../src/errors/notFound');

describe('NoopStore', function() {
  describe('#get()', function() {
    it('should return a rejected promise', function() {
      var store = new NoopStore();
      return expect(store.get('test')).to.eventually.be.rejectedWith(NotFoundError);
    });
  });

  describe('#set()', function() {
    it('should return a rejected promise for a set value', function() {
      var store = new NoopStore();

      return Promise.all([
        expect(store.set('test', 'value')).to.eventually.equal('value'),
        expect(store.get('test')).to.eventually.be.rejectedWith(NotFoundError)
      ]);
    });
  });
});
