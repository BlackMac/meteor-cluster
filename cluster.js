function Cluster() {
    
    var serverId = Random.id();
    var redisPublishClient;
    var redisSubscribeClient;

    var collections = {};

    this.watch = function() {

        _.each(arguments, function(collection) {
            collections[collection._name] = collection;
            watchCollection(collection);
        });
    }

    this.init = function(redisConfig) {
        redisConfig = redisConfig || {};

        redisPublishClient = createRedisClient(redisConfig);
        redisSubscribeClient = createRedisClient(redisConfig);

        redisSubscribeClient.on('message', function(channel, message) {
            var parsedMessage = JSON.parse(message);
            if(parsedMessage[0] != serverId) {
                onMessage(parsedMessage[1], parsedMessage[2], parsedMessage[3]);
            }
        });

        redisSubscribeClient.subscribe('meteor');
    };

    function watchCollection(collection) {    
        var methods = ['insert', 'update', 'remove'];
        methods.forEach(function(method) {
            var original = collection._collection[method];
            collection._collection[method] = function() {
                original.apply(collection, arguments);
                publishAction(collection._name, method, arguments);
            };
        });
    }

    function publishAction(collectionName, method, arguments) {
        
        if(!(arguments[0]._dontPublish)) {
            if(method == 'insert') {
                arguments = [{_id: arguments[0]._id}];
            }
            onAction(collectionName, method, arguments);
        }
    }

    function onAction(collectionName, method, args) {   
        if(redisPublishClient) {
            var sendData = [serverId, collectionName, method, args];
            var sendDataString = JSON.stringify(sendData);

            redisPublishClient.publish('meteor', sendDataString);
        }
    }

    function onMessage(collectionName, method, args) {
        var collection = collections[collectionName];
        var Fiber = Npm.require('fibers');
        
        if(collection) {
            if(method == 'insert') {
                Fiber(function() {
                    collection.update(args[0]._id, {$set: {}});
                }).run();
            } else if (method == 'update') {
                //get this from somewhere else
                Fiber(function() {
                    var docs = collection.find(args[0]);
                    docs.forEach(function(doc) {
                        var query = {_id: doc._id, _dontPublish: true};
                        collection.update(query, {$set: {}});
                    });
                }).run();
            } else if (method == 'remove') {
                var query = (typeof(args[0]) == 'object')? args[0]: { _id: args[0]};
                query._dontPublish = true;

                Fiber(function() {
                    collection.remove(query);
                }).run();
            }
        }
    }
}


function createRedisClient(conf) {
    console.info('connecting to redis', {port: conf.port, host: conf.host, db: conf.db, auth: conf.auth});

    var redis = Npm.require('redis');
    var client = redis.createClient(conf.port, conf.host);
    
    if(conf.auth) {
        client.auth(conf.auth, afterAuthenticated);
    }

    if(conf.db) {
        client.select(conf.db, afterDbSelected);
    }

    function afterAuthenticated(err) {
      
        if(err) {
            throw err;
        }
    }

    function afterDbSelected(err) {

        if(err) {
            console.error('db selection failed', { error: err.message, db: conf.db });
        } else {
            console.info('db selected', { db: conf.db });
        }
    }

    client.on('error', function(err) {
        
        console.error('connection to redis disconnected', {port: conf.port, host: conf.host, auth: conf.auth, error: err.toString()})
    });

    client.on('connect', function() {
        
        console.info('connected to redis', {port: conf.port, host: conf.host, auth: conf.auth});
    });

    client.on('reconnecting', function() {

        console.info('re-connecting to redis', {port: conf.port, host: conf.host, auth: conf.auth});
    });

    return client;
};

Meteor.Cluster = new Cluster();