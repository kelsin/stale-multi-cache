var chai = require('chai');
chai.use(require('chai-as-promised'));
var expect = chai.expect;
var sinon = require('sinon');
var Promise = require('bluebird');

var RedisStore = require('../src/stores/redis');
var NotFoundError = require('../src/errors/notFound');

// Simple client that behaves like ioredis
var client = {
  get: function(key) {
    if(key === 'test') {
      return Promise.resolve('value');
    } else {
      return Promise.resolve(null);
    }
  },
  set: function(key, value) {
    return Promise.resolve('OK');
  }
};

describe('Redis', function() {
  describe('#get()', function() {
    it('should return a rejected promise for an unknown value', function() {
      var store = new RedisStore(client);
      return expect(store.get('unknown')).to.eventually.be.rejectedWith(NotFoundError);
    });
  });

  describe('#set()', function() {
    it('should return a resolved promise for a set value', function() {
      var store = new RedisStore(client);

      expect(store.set('test', 'value')).to.eventually.equal('value');
      return expect(store.get('test')).to.eventually.equal('value');
    });
  });
});
