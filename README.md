### hapi auth bearer

[![Build Status](https://travis-ci.org/tk120404/hapi-bearer-auth.svg?branch=master)](https://travis-ci.org/tk120404/hapi-bearer-auth)

[Release Notes] supports hapi v17 and above.


Lead Maintainer:  [Arjunkumar T K](https://github.com/tk120404), [John Brett](https://github.com/johnbrett)


Bearer authentication requires validating a token passed in by bearer authorization header or query parameter.

This module creates a `'bearer-access-token'` scheme takes the following options:

- `validate` - (required) a token validation function with the signature `[async] function(request, token, h)` where:
    - `request` - is the hapi request object of the request which is being authenticated.
    - `token` - the auth token received from the client.
    - `h` - the response toolkit.
    - `entity` - the entity which is being authenticated
    - Returns an object `{ isValid, credentials, artifacts, isblocked }` where:
        - `isValid` - `true` if token is valid, otherwise `false`.
        - `credentials` - a credentials object passed back to the application in `request.auth.credentials`. Note that due to underlying Hapi expectations, this value must be defined even if `isValid` is `false`. We recommend it be set to `{}` if `isValid` is `false` and you have no other value to provide.
        - `artifacts` - optional [authentication](http://hapijs.com/tutorials/auth) related data that is not part of the user's credential.
        - `isblocked` - optional and defaults to false, if true throw Block error message 

- `options` - (optional)
    - `accessTokenName` (Default: `'access_token'`) - Rename token key e.g. 'new_name' would rename the token query parameter to `/route1?new_name=1234`.
    - `allowQueryToken` (Default: `false`) - Accept token via query parameter.
    - `allowCookieToken` (Default: `false`) - Accept token via cookie.
    - `allowMultipleHeaders` (Default: `false`) - Accept multiple authorization headers, e.g. `Authorization: FD AF6C74D1-BBB2-4171-8EE3-7BE9356EB018; Bearer 12345678`.
    - `tokenType` (Default: `'Bearer'`) - Accept a custom token type e.g. `Authorization: Basic 12345678`.
    - `allowChaining` (Default: `false`) - Allow attempt of additional authentication strategies.
    - `unauthorized` (Default: `Boom.unauthorized`) - A function to call when unauthorized with signature `function([message], [scheme], [attributes])`. [More details](https://github.com/hapijs/boom#boomunauthorizedmessage-scheme-attributes)
    - `entityType` - Accept a custom entity token type e.g. `Authorization: Unit 40934509`.

        If using a custom `unauthorized` function, it is recommended you read hapi's documentation on authentication schemes, especially in the case of using multiple strategies: [Authentication scheme](https://hapijs.com/api#authentication-scheme).

```javascript
const Hapi = require('hapi');
const AuthBearer = require('hapi-bearer-auth');

const server = Hapi.server({ port: 8080 });

const start = async () => {

    await server.register(AuthBearer)

    server.auth.strategy('simple', 'bearer-access-token', {
        allowQueryToken: true,              // optional, false by default
        validate: async (request, token, h, entity) => {

            // here is where you validate your token
            // comparing with token from your database for example
            const isValid = token === '1234',
                  credentials = { token },
                  artifacts = { test: 'info' },
                  isblocked = false

            return { isValid, credentials, artifacts, isblocked };//isblocked is optional
        }
    });

    server.auth.default('simple');

    server.route({
        method: 'GET',
        path: '/',
        handler: async function (request, h) {

            return { info: 'success!' };
        }
    });

    await server.start();

    return server;
}

start()
    .then((server) => console.log(`Server listening on ${server.info.uri}`))
    .catch(err => {

        console.error(err);
        process.exit(1);
    })


/*
 * To test this example, from your terminal try:
 *  curl localhost:8080
 *     response: {"statusCode":401,"error":"Unauthorized","message":"Missing authentication"}
 *  curl localhost:8080?access_token=abc
 *     response: {"statusCode":401,"error":"Unauthorized","message":"Bad token","attributes":{"error":"Bad token"}}
 *  curl curl localhost:8080?access_token=1234
 *     response: {"info":"success!"}
 */
```

License MIT @ John Brett and other contributors 2019
