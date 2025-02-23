'use strict';

const Boom = require('@hapi/boom');
const Hoek = require('@hapi/hoek');
const Joi = require('@hapi/joi');

// Declare Internals

const internals = {};

internals.defaults = {
    accessTokenName: 'access_token',
    allowQueryToken: false,
    allowCookieToken: false,
    allowMultipleHeaders: false,
    allowChaining: false,
    tokenType: 'Bearer',
    unauthorized: Boom.unauthorized
};

internals.schema = Joi.object().keys({
    validate: Joi.func().required(),
    accessTokenName: Joi.string().required(),
    allowQueryToken: Joi.boolean(),
    allowCookieToken: Joi.boolean(),
    allowMultipleHeaders: Joi.boolean(),
    allowChaining: Joi.boolean(),
    tokenType: Joi.string().required(),
    unauthorized: Joi.func(),
    entityType: Joi.string()
});

internals.implementation = (server, options) => {

    Hoek.assert(options, 'Missing bearer auth strategy options');

    const settings = Hoek.applyToDefaults(internals.defaults, options);
    Joi.assert(settings, internals.schema);

    const headerRegExp = new RegExp(settings.tokenType + '\\s+([^;$]+)', 'i');
    const entityRegExp = new RegExp(settings.entityType + '\\s+([^;$]+)', 'i');

    const scheme = {
        authenticate: async(request, h) => {

            let authorization = request.raw.req.headers.authorization;
            let entityAuthorization;
            if (settings.allowCookieToken &&
                !authorization &&
                request.state[settings.accessTokenName]) {

                authorization = `${settings.tokenType} ${request.state[settings.accessTokenName]}`;
            }

            if (settings.allowQueryToken &&
                !authorization &&
                request.query[settings.accessTokenName]) {

                authorization = `${settings.tokenType} ${request.query[settings.accessTokenName]}`;
                delete request.query[settings.accessTokenName];
            }

            if (!authorization) {
                return settings.unauthorized(null, settings.tokenType);
            }

            let entity;
            if (settings.allowMultipleHeaders) {
                const headers = authorization.match(headerRegExp);
                if (headers !== null) {
                    authorization = headers[0];
                }

                const entities = authorization.match(entityRegExp);
                if (entities !== null) {
                    entityAuthorization = entities[0];
                }

                if (!entityAuthorization)
                    throw settings.unauthorized(null, settings.entityType);

                const [entityTokenType, entityId] = entityAuthorization.split(/\s+/);
                if (!entityId ||
                    entityTokenType.toLowerCase() !== settings.entityType.toLowerCase()) {
                    throw settings.unauthorized(null, settings.entityType);
                }

                entity = entityId;
            } else {
                entity = undefined;
            }

            const [tokenType, token] = authorization.split(/\s+/);

            if (!token ||
                tokenType.toLowerCase() !== settings.tokenType.toLowerCase()) {
                throw settings.unauthorized(null, settings.tokenType);
            }

            const { isValid, credentials, artifacts, isBlocked = false } = await settings.validate(request, token, h, entity);

            if (!isValid || isBlocked) {
                let block_message;
                let message;
                if (isBlocked) {
                    block_message = 'Oops, Your account is blocked. Please contact your admin';
                } else {
                    message = 'Bad token';
                    if (settings.allowChaining) {
                        const routeSettings = request.route.settings.auth;
                        const auth = routeSettings || request.server.auth.lookup(request.route);
                        if (auth.strategies.length > 1) {
                            message = null;
                        }
                    }
                }

                return h.unauthenticated(settings.unauthorized(message || block_message, settings.tokenType), { credentials: credentials || {}, artifacts });
            }

            if (!credentials ||
                typeof credentials !== 'object') {
                throw h.unauthenticated(Boom.badImplementation('Bad token string received for Bearer auth validation'), { credentials: {} });
            }

            return h.authenticated({ credentials, artifacts });
        }
    };

    return scheme;
};

exports.plugin = {
    pkg: require('../package.json'),
    register: (server, options) => server.auth.scheme('bearer-access-token', internals.implementation)
};