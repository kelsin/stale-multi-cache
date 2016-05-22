var chai = require('chai');
var expect = chai.expect;

var NotFoundError = require('../src/errors/notFound');

describe('NotFoundError', function() {
  it('should be an error', function() {
    var error = new NotFoundError('key');
    expect(error instanceof Error).to.be.true;
  });

  it('should save the key used', function() {
    var error = new NotFoundError('key');
    expect(error.key).to.equal('key');
  });
});
