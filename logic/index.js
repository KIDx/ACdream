
var Q = require('q');

var Contest = require('../models/contest.js');
var ContestRank = require('../models/contestrank.js');
var Overview = require('../models/overview.js');

exports.ReadFile = function(fs, path) {
  var d = Q.defer();
  fs.readFile(path, function(err, data){
    if (err) {
      d.reject(err);
    } else {
      d.resolve(data);
    }
  });
  return d.promise;
};

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

exports.GetRedis = function(client, key) {
  var d = Q.defer();
  client.get(key, function(err, val){
    if (err) {
      d.reject(err);
    } else {
      d.resolve(val);
    }
  });
  return d.promise;
};

exports.ClearReduceData = function(cids) {
  return Q.all([
    ContestRank.clear({'_id.cid': {$in: cids}}),
    Overview.remove({'_id.cid': {$in: cids}}),
    Contest.multiUpdate({contestID: {$in: cids}}, {$set: {
      maxRunID: 0,
      updateTime: 0,
      overviewRunID: 0,
      overviewUpdateTime: 0
    }})
  ]);
};
