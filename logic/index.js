
var Q = require('q');

exports.SaveDoc = function(doc) {
  var d = Q.defer();
  doc.save(function(err){
    if (err) {
      d.reject(err);
    } else {
      d.resolve(doc);
    }
  });
  return d.promise;
};

exports.SetRedis = function(client, key, val) {
  var d = Q.defer();
  client.set(key, val, function(err){
    if (err) {
      d.reject(err);
    } else {
      d.resolve();
    }
  });
  return d.promise;
};
