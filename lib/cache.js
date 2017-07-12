'use strict';

let cache = {};

module.exports = {
  set: (id, value) => {
    cache[id] = value;
  },
  get: (id) => {
    return cache[id];
  },
  reset: () => {
    cache = {};
  },
  toJSON: () => {
    return JSON.stringify(cache);
  }
};
