'use strict';

const request = require('request-promise-native');
const cache = require('./cache');

const defaultInt = 1000;

module.exports = endpoints => {

  return (req, res, next) => {
    if (endpoints && endpoints.length) {

      let requests = endpoints.reduce((memo, option) => {
        const url = option.url;
        const interval = parseInt(option.interval, 10) || defaultInt;
        const currTime = Date.now();
        const futureTime = currTime + interval;
        const savedTime = cache.get(url);

        // Is this the first time or has the interval expired
        if (isNaN(savedTime) || savedTime < currTime) {
          cache.set(url, futureTime);
          memo.push(request(url).promise());
        }
        return memo;

      }, []);

      // Process all pending requests
      return Promise.all(requests)
        .then(resolved => {
          // resolved is an array
          for (var i = 0; i < resolved.length; i++) {
            let response;
            try {
              // if response is JSON
              response = JSON.parse(resolved[i]);
            } catch (e) {
              response = resolved[i];
            }

            if (response) {
              // find the status code
              const status = response.statusCode || response.status;
              // If there is a status code
              // but it's not a 200, throw an Error
              if (status) {
                if (parseInt(status, 10) !== 200) {
                  throw new Error(resolved[i]);
                }
              }
            }
          }
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
          req.log('error', error);
          next(error);
        });
    }

    next();
  };

};
