var chai = require('chai');
chai.use(require('chai-as-promised'));
var expect = chai.expect;

var moment = require('moment');
var Value = require('../src/value');

// Times to play with
var now = moment();
var tomorrow = moment(now).add(1, 'day');

describe('Value', function() {
  describe('#get()', function() {
    it('should return the value that was set', function() {
      var value = new Value('test', tomorrow);
      return expect(value.get()).to.equal('test');
    });
  });

  describe('#getExpires()', function() {
    it('should return the expires value that was set', function() {
      var value = new Value('test', tomorrow);
      return expect(value.getExpires()).to.equal(tomorrow);
    });

    it('should return undefined if expires was not set', function() {
      var value = new Value('test');
      return expect(value.getExpires()).to.be.undefined;
    });
  });

  describe('#set()', function() {
    it('should change the value', function() {
      var value = new Value('test', tomorrow);
      expect(value.get()).to.equal('test');
      value.set('test2');
      return expect(value.get()).to.equal('test2');
    });
  });

  describe('#expired()', function() {
    it('should return false for an object with no ttl', function() {
      var value = new Value('test');
      return expect(value.expired()).to.be.false;
    });

    it('should return false for an object that is not expired', function() {
      var value = new Value('test', tomorrow);
      return expect(value.expired()).to.be.false;
    });

    it('should return true for an object that is expired', function() {
      var value = new Value('test', now);
      return expect(value.expired()).to.be.true;
    });
  });

  describe('#setExpires()', function() {
    it('should change the expires', function() {
      var value = new Value('test', tomorrow);
      expect(value.expired()).to.be.false;
      value.setExpires(now);
      expect(value.expired()).to.be.true;
    });
  });
});
