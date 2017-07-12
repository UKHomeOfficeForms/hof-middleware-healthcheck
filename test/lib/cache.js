'use strict';

const cache = require('../../lib/cache.js');

describe('./lib/cache', () => {

  describe('set', () => {
    it('sets key value pairs to the cache', () => {
      cache.set('foo', 12345);

      cache.toJSON().should.deep.equal('{"foo":12345}');
    });
  });

  describe('get', () => {
    it('returns the value by key', () => {
      cache.set('foo', 12345);

      cache.get('foo').should.equal(12345);
    });
  });

  describe('reset', () => {
    it('resets the cache to an empty object', () => {
      cache.set('foo', 12345);

      cache.reset();
      cache.toJSON().should.deep.equal('{}');
    });
  });
});
