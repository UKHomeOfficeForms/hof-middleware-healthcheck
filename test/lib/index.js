'use strict';

const proxyquire = require('proxyquire');
const reqres = require('reqres');

const promiseMatcher = sinon.match(value => {
  return value instanceof Promise;
}, 'Not an instance of a Promise');

// Stubbing request(url).promise()
// request(url).promise() will return a pending promise
const resolvedPromiseStub = sinon.stub().returns(
  new Promise(resolve => resolve(JSON.stringify({
    statusCode: '200'
  })))
);

const resolvedFailedPromiseStub = sinon.stub().returns(
  new Promise(resolve => resolve(JSON.stringify({
    statusCode: '400'
  })))
);
const rejectedPromiseStub = sinon.stub().returns(
  new Promise((resolve, reject) => reject(JSON.stringify({
    statusCode: '500'
  })))
);

// mock urls
const success = '/success';
const success2 = '/success/2';
const rejection = '/rejection';
const failure = '/failure';

const requestStub = sinon.stub();

// calling request with different mock urls return different promises
requestStub.withArgs(success).returns({promise: resolvedPromiseStub});
requestStub.withArgs(success2).returns({promise: resolvedPromiseStub});
requestStub.withArgs(rejection).returns({promise: rejectedPromiseStub});
requestStub.withArgs(failure).returns({promise: resolvedFailedPromiseStub});

const cache = require('../../lib/cache');

const healthMiddleware = proxyquire('../../lib', {
  'request-promise-native': requestStub
});

describe('hof-middleware-healthcheck', () => {

  it('returns a middleware function', () => {
    healthMiddleware().should.be.a('function');
  });

  describe('middleware', () => {

    const req = reqres.req();
    const res = reqres.res();

    let clock;
    let middleware;

    beforeEach(() => {
      req.log = sinon.stub();
      clock = sinon.useFakeTimers(Date.now());
      sinon.spy(Promise, 'all');
      cache.reset();
    });

    afterEach(() => {
      clock.restore();
      Promise.all.restore();
    });

    it('always makes a request if the url has not yet been called', (done) => {
      const options = {
        health: [{
          url: success
        }]
      };
      middleware = healthMiddleware(options.health);

      return middleware(req, res, (err) => {
        Promise.all.should.have.been.calledWith([promiseMatcher]);
        should.not.exist(err);
        done();
      });
    });

    it('does not make a request if the default 1000ms interval has not passed', (done) => {
      // add the success url to the cache with a time lower than the future time
      // future time = now + interval (interval default = 1000ms);
      cache.set(success, {
        expires: Date.now()
      });
      const options = {
        health: [{
          url: success
        }]
      };
      middleware = healthMiddleware(options.health);
      return middleware(req, res, (err) => {
        Promise.all.should.have.been.calledWith([]);
        should.not.exist(err);
        done();
      });
    });

    it('the default interval can be optionally overridden', (done) => {
      cache.set(success, {
        expires: Date.now()
      });
      const options = {
        health: [{
          url: success,
          interval: 0
        }]
      };
      // move the clock on so the internal current time
      // is greater than the cached current time
      clock.tick(10);

      middleware = healthMiddleware(options.health);
      return middleware(req, res, (err) => {
        Promise.all.should.have.been.calledWith([promiseMatcher]);
        should.not.exist(err);
        done();
      });
    });

    it('uses the cached promise if it has not been resolved', (done) => {
      // set the cached promise
      const promise = Promise;
      cache.set(success, {
        expires: Date.now(),
        promise: promise
      });
      const options = {
        health: [{
          url: success,
          interval: 0
        }]
      };
      // move the clock on so the internal current time
      // is greater than the cached current time
      clock.tick(10);

      middleware = healthMiddleware(options.health);

      return middleware(req, res, (err) => {
        Promise.all.should.have.been.calledWith([promise]);
        should.not.exist(err);
        done();
      });
    });

    it('removes all cached promises after they have been resolved', (done) => {
      // set the cached promise
      const promise = Promise;
      cache.set(success, {
        expires: Date.now(),
        promise: promise
      });
      const options = {
        health: [{
          url: success,
          interval: 0
        }]
      };
      // move the clock on so the internal current time
      // is greater than the cached current time
      clock.tick(10);

      middleware = healthMiddleware(options.health);

      return middleware(req, res, (err) => {
        should.equal(cache.get(success).promise, undefined);
        should.not.exist(err);
        done();
      });
    });

    it('uses the cached promise if it has not been rejected', (done) => {
      // set the cached promise
      const promise = Promise;
      cache.set(failure, {
        expires: Date.now(),
        promise: promise
      });
      const options = {
        health: [{
          url: failure,
          interval: 0
        }]
      };
      // move the clock on so the internal current time
      // is greater than the cached current time
      clock.tick(10);

      middleware = healthMiddleware(options.health);

      return middleware(req, res, (err) => {
        Promise.all.should.have.been.calledWith([promise]);
        should.not.exist(err);
        done();
      });
    });

    it('removes all cached promises after any have been rejected', (done) => {
      // set the cached promise
      const promise = Promise;
      cache.set(failure, {
        expires: Date.now(),
        promise: promise
      });
      const options = {
        health: [{
          url: failure,
          interval: 0
        }]
      };
      // move the clock on so the internal current time
      // is greater than the cached current time
      clock.tick(10);

      middleware = healthMiddleware(options.health);

      return middleware(req, res, (err) => {
        should.equal(cache.get(failure).promise, undefined);
        should.not.exist(err);
        done();
      });
    });

    it('calls next without an error when all health urls are resolved successfully', (done) => {
      cache.set(success, {
        expires: Date.now()
      });
      const options = {
        health: [{
          url: success,
          interval: 0
        }, {
          url: success2,
          interval: 0
        }]
      };

      clock.tick(10);

      middleware = healthMiddleware(options.health);

      return middleware(req, res, (err) => {
        Promise.all.should.have.been.calledWith([promiseMatcher, promiseMatcher]);
        should.not.exist(err);
        done();
      });
    });

    it('calls next with `UNHEALTHY` error if a health url is rejected', (done) => {
      cache.set(success, {
        expires: Date.now()
      });
      cache.set(rejection, {
        expires: Date.now()
      });
      const options = {
        health: [{
          url: rejection,
          interval: 0
        }, {
          url: success,
          interval: 0
        }]
      };

      clock.tick(10);

      middleware = healthMiddleware(options.health);

      return middleware(req, res, (err) => {
        Promise.all.should.have.been.calledWith([promiseMatcher, promiseMatcher]);
        err.should.be.an.instanceof(Error);
        err.code.should.equal('UNHEALTHY');
        done();
      });
    });

    it('calls next with `UNHEALTHY` error if a health url is resolved with an error', (done) => {
      cache.set(success, {
        expires: Date.now()
      });
      cache.set(failure, {
        expires: Date.now()
      });

      const options = {
        health: [{
          url: failure,
          interval: 0
        }, {
          url: success,
          interval: 0
        }]
      };

      clock.tick(10);

      middleware = healthMiddleware(options.health);

      return middleware(req, res, (err) => {
        Promise.all.should.have.been.calledWith([promiseMatcher, promiseMatcher]);
        err.code.should.equal('UNHEALTHY');
        err.should.be.an.instanceof(Error);
        done();
      });
    });

    it('non-JSON responses are logged with `debug`', (done) => {
      const options = {
        health: [{
          url: success,
          interval: 0
        }]
      };

      middleware = healthMiddleware(options.health);

      return middleware(req, res, (err) => {
        // eslint-disable-next-line quotes
        req.log.should.have.been.calledWith('debug', ['{"statusCode":"200"}']);
        should.not.exist(err);
        done();
      });
    });

    it('resolved requests are logged with `debug`', (done) => {
      const options = {
        health: [{
          url: success,
          interval: 0
        }]
      };

      middleware = healthMiddleware(options.health);

      return middleware(req, res, (err) => {
        // eslint-disable-next-line quotes
        req.log.should.have.been.calledWith('debug', ['{"statusCode":"200"}']);
        should.not.exist(err);
        done();
      });
    });

    it('rejected requests are logged with `error`', (done) => {
      const options = {
        health: [{
          url: rejection,
          interval: 0
        }]
      };

      middleware = healthMiddleware(options.health);

      return middleware(req, res, (err) => {
        req.log.should.have.been.calledWith('error', err);
        should.exist(err);
        done();
      });
    });

  });

});

