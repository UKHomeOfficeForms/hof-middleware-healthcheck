'use strict';

const request = require('request-promise-native');
const cache = require('./cache');

const defaultInt = 1000;
const isFirst = (saved) => !saved || isNaN(saved.expires);
const hasExpired = (saved, now) => saved && saved.expires < now;

module.exports = endpoints => {

  return (req, res, next) => {
    if (endpoints && endpoints.length) {

      let requests = endpoints.reduce((memo, option) => {
        const url = option.url;
        const interval = parseInt(option.interval, 10) || defaultInt;
        const now = Date.now();
        const future = now + interval;
        const saved = cache.get(url);

        // Is this the first pass
        // Has the interval expired
        if (isFirst(saved) || hasExpired(saved, now)) {

          // If a promise exists in the cache for this url
          // use the existing cached promise
          // otherwise create a new request promise
          const promise = saved && saved.promise ?
            saved.promise :
            request(url).promise();

          // set properties for next request
          cache.set(url, {
            expires: future,
            promise: promise
          });

          memo.push(promise);
        }

        return memo;
      }, []);

      // Process all pending requests
      return Promise.all(requests)
        .then(resolved => {
          // Resolved is an array
          for (var i = 0; i < resolved.length; i++) {
            let response;
            try {
              response = JSON.parse(resolved[i]);
            } catch (e) {
              response = resolved[i];
            }

            if (response) {
              const status = response.statusCode || response.status;
              if (status) {
                if (parseInt(status, 10) >= 400) {
                  throw new Error(resolved[i]);
                }
              }
            }
          }
          // All promises have been resolved
          // Remove all promises so the next
          // request will invoke fresh health requests
          cache.reset('promise');

          req.log('debug', resolved);
          next();
        })
        .catch(error => {
          if (!(error instanceof Error)) {
            error = new Error(error);
          }
          // Assign a code and let
          // the error middleware handle it
          error.code = 'UNHEALTHY';

          // This promise has been rejected
          // Remove all promises so the next
          // request will invoke fresh health requests
          cache.reset('promise');

          req.log('error', error);
          next(error);
        });
    }

    next();
  };

};
