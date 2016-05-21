var chai = require('chai');
chai.use(require('chai-as-promised'));
var expect = chai.expect;

var Value = require('../src/value');

describe('Value', function() {
  describe('#get()', function() {
    it('should return the value that was set', function() {
      var value = new Value('test', 60);
      return expect(value.get()).to.equal('test');
    });
  });

  describe('#set()', function() {
    it('should change the value', function() {
      var value = new Value('test', 60);
      expect(value.get()).to.equal('test');
      value.set('test2');
      return expect(value.get()).to.equal('test2');
    });
  });

  describe('#expired()', function() {
    it('should return false for an object that is not expired', function() {
      var value = new Value('test', 60);
      return expect(value.expired()).to.be.false;
    });

    it('should return true for an object that is expired', function() {
      var value = new Value('test', 0);
      return expect(value.expired()).to.be.true;
    });
  });

  describe('#ttl()', function() {
    it('should change the ttl', function() {
      var value = new Value('test', 60);
      expect(value.expired()).to.be.false;
      value.ttl(0);
      expect(value.expired()).to.be.true;
    });
  });
});
