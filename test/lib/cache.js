'use strict';

const cache = require('../../lib/cache.js');

describe('./lib/cache', () => {

  beforeEach(() => {
    cache.reset();
  });

  describe('set', () => {
    it('sets key value pairs to the cache', () => {
      cache.set('foo', {
        bar: 12345,
        baz: 'test'
      });
      cache.set('bar', {
        foo: 67890,
        baz: 'test'
      });

      cache.get().should.deep.equal({
        foo: {
          bar: 12345,
          baz: 'test'
        },
        bar: {
          foo: 67890,
          baz: 'test'
        }
      });
    });
  });

  describe('get', () => {
    it('returns the value by id', () => {
      cache.set('foo', {
        bar: 12345,
        baz: 'test'
      });

      cache.get('foo').should.deep.equal({
        bar: 12345,
        baz: 'test'
      });
    });
    it('returns the entire cache without an id', () => {
      cache.set('foo', {
        bar: 12345,
        baz: 'test'
      });

      cache.get().should.deep.equal({foo: {
        bar: 12345,
        baz: 'test'
      }});
    });
  });

  describe('reset', () => {
    it('resets the named properties to undefined', () => {
      cache.set('foo', {
        bar: 12345,
        baz: 'one'
      });
      cache.set('bar', {
        foo: 67890,
        baz: 'two'
      });

      cache.reset('baz');

      cache.get('foo').should.deep.equal({
        bar: 12345,
        baz: undefined
      });
      cache.get('bar').should.deep.equal({
        foo: 67890,
        baz: undefined
      });
    });

    it('resets the cache to an empty object without a name', () => {
      cache.set('foo', {
        bar: 12345,
        baz: 'test'
      });

      cache.reset();
      cache.get().should.deep.equal({});
    });
  });
});
