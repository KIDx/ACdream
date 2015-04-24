
var fs = require('fs');
var Q = require('q');
var gm = require('gm');

var Contest = require('../models/contest.js');
var ContestRank = require('../models/contestrank.js');
var Overview = require('../models/overview.js');
var User = require('../models/user.js');

exports.ReadFile = function(path) {
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

exports.MkDir = function(path) {
  var d = Q.defer();
  fs.exists(path, function(bIsExist){
    if (bIsExist) {
      d.resolve();
    } else {
      fs.mkdir(path, function(err){
        if (err) {
          d.reject(err);
        } else {
          d.resolve();
        }
      });
    }
  });
  return d.promise;
};

exports.ResizeAndWriteImg = function(src, dst, w, h) {
  var d = Q.defer();
  gm.subClass({ imageMagick : true })(src).resize(w, h, '!')
  .autoOrient()
  .write(dst, function(err){
    if (err) {
      d.reject(err);
    } else {
      d.resolve();
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

exports.GetRatingBeforeCount = function(user) {
  return User.count({
    name: {$ne: 'admin'},
    $or:[
      { rating: {$gt: user.rating} },
      { rating: user.rating, name: {$lt: user.name} }
    ]
  });
};

exports.GetRankBeforeCount = function(user) {
  return User.count({
    name: {$ne: 'admin'},
    $or:[
      { solved: {$gt: user.solved} },
      { solved: user.solved, submit: {$lt: user.submit} },
      { solved: user.solved, submit: user.submit, name: {$lt: user.name} }
    ]
  });
};
