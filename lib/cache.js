'use strict';

let cache = {};

module.exports = {
  set: (id, value) => {
    cache[id] = value;
  },
  get: (id) => {
    return id ? cache[id] : cache;
  },
  reset: (name) => {
    if (name) {
      // Reset the named property on each cached item
      Object.keys(cache).forEach(id => {
        cache[id][name] = undefined;
      });
    } else {
      cache = {};
    }

  }
};
