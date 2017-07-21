HOF Middleware Healthcheck
==========================

Execute regular health checks against the API endpoints in a HOF service

# Rationale

When a HOF service depends on the availability or "health" of another service, it's usability can be severely impacted when the other service is not responding as expected. Many third-party services expose an API endpoint that can be monitored for such instances. In these cases the health should be regularly monitored. When the endpoint returns a status indicating that the service is not healthy, in cases where the health of another serverely impacts the HOF service, a suitable message should be presented to the user of the HOF service.

# Middleware

## Usage

Mount the middleware in HOF to be called on all `GET` requests (The middleware can be mounted on any method).

```js
const healthcheck = require('hof-middleware-healthcheck');

app.get(healthcheck(config.health));
```

Configure the healthcheck endpoints.

```js
const hof = require('hof');

hof({
  routes: [
    ...
  ],
  health: [{
    url: 'https://third.party.api/monitor'
  }, {
    url: 'http://www.example.com/status',
    interval: 100
  }]
};
```

### Options

- `url`: The API endpoint url to call. It should not require any parameters. Required.
- `interval`: Intervals in milliseconds at which to call the endpoint url. Defaults to 1000ms. Optional.
