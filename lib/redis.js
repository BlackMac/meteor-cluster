var url     = Npm.require('url');

Meteor._createRedisClient = function _createRedisClient(conf) {
    conf = conf || {};

    console.info('connecting to redis');

    var redis = Npm.require('redis');
    var client = redis.createClient(conf.port, conf.host);
    
    if(conf.auth) {
        client.auth(conf.auth, afterAuthenticated);
    }

    function afterAuthenticated(err) {   
        if(err) {
            throw err;
        }
    }

    client.on('error', function(err) {
        console.error('connection to redis disconnected', {error: err.toString()})
    });

    client.on('connect', function() {    
        console.info('connected to redis');
    });

    client.on('reconnecting', function() {
        console.info('re-connecting to redis');
    });

    return client;
};

Meteor._parseRedisEnvUrl = function _parseRedisEnvUrl() {
    if(process.env.REDIS_URL) {
        var parsedUrl = url.parse(process.env.REDIS_URL);
        if(parsedUrl.protocol == 'redis:' && parsedUrl.hostname && parsedUrl.port) {
            var connObj = {
                host: parsedUrl.hostname,
                port: parseInt(parsedUrl.port), 
            };

            if(parsedUrl.auth) {
                connObj.auth = parsedUrl.auth.split(':')[1];
            }

            return connObj;
        } else {
            throw new Error(
                'REDIS_URL must contain following url format\n\tredis://redis:<password>@<hostname>:<port>'
            );
        }
    } else {
        return null;
    }
}