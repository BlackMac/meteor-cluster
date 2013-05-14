Package.describe({
  summary: "Smarter way to run cluster of meteor nodes"
});

Npm.depends({"redis" : "0.8.3"});

Package.on_use(function (api, where) {
  api.use(['mongo-livedata'], 'server');
  api.add_files(['lib/redis.js', 'lib/cluster.js'], 'server');
});

Package.on_test(function (api) {
  api.use(['mongo-livedata'], 'server');
  api.add_files(['lib/redis.js', 'lib/cluster.js'], 'server');
  api.add_files(['test/publish.js', 'test/subscribe.js'], 'server');
});