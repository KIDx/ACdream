
var Q = require('q');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Settings = require('../settings');
var pageNum = Settings.contestRank_pageNum;
var initialValue = {
  penalty: 0,
  solved: 0,
  submitTime: 0
};

function Rank(cid, name) {
  this.cid = cid;
  this.name = name;
};

module.exports = Rank;

var rankObj = new Schema({
  _id: {type: Object, index: {unique: true}},
  value: Object
});

rankObj.index({
  '_id.cid': 1,
  'value.solved': -1,
  'value.penalty': 1,
  'value.submitTime': -1,
  '_id.name': 1
});

mongoose.model('ranks', rankObj);
var ranks = mongoose.model('ranks');

Rank.prototype.save = function() {
  var d = Q.defer();
  rank = new ranks();
  rank.value = initialValue;
  rank._id = new Object({ name: this.name, cid: this.cid });
  rank.save(function(err){
    if (err) {
      d.reject(err);
    } else {
      d.resolve();
    }
  });
  return d.promise;
};

Rank.findOne = function(cond) {
  var d = Q.defer();
  ranks.findOne(cond, function(err, doc){
    if (err) {
      d.reject(err);
    } else {
      d.resolve(doc);
    }
  });
  return d.promise;
};

Rank.get = function(cond, page) {
  var d = Q.defer();
  ranks.count(cond, function(err, count){
    if ((page-1)*pageNum > count) {
      return d.resolve({
        users: [],
        totalPage: 1
      });
    }
    ranks.find(cond).sort({
      'value.solved': -1,
      'value.penalty': 1,
      'value.submitTime': -1,
      '_id.name': 1
    }).skip((page-1)*pageNum).limit(pageNum).exec(function(err, docs) {
      if (err) {
        d.reject(err);
      } else {
        d.resolve({
          users: docs,
          totalPage: Math.floor((count+pageNum-1)/pageNum)
        });
      }
    });
  });
  return d.promise;
};

Rank.getAll = function(cond) {
  var d = Q.defer();
  ranks.find(cond).sort({
    'value.solved': -1,
    'value.penalty': 1,
    'value.submitTime': -1,
    '_id.name': 1
  }).exec(function(err, docs){
    if (err) {
      d.reject(err);
    } else {
      d.resolve(docs);
    }
  });
  return d.promise;
};

Rank.count = function(cond) {
  var d = Q.defer();
  ranks.count(cond, function(err, count){
    if (err) {
      d.reject(err);
    } else {
      d.resolve(count);
    }
  });
  return d.promise;
};

Rank.create = function(cid, names) {
  var docs = [];
  names.forEach(function(p){
    if (p !== 'admin') {
      docs.push({
        _id: {name: p, cid: cid},
        value: initialValue
      });
    }
  });
  var d = Q.defer();
  if (docs.length === 0) {
    d.resolve();
  } else {
    ranks.create(docs, function(err){
      if (err && err.code !== 11000 && err.code !== 11001) {
        d.reject(err);
      } else {
        d.resolve();
      }
    });
  }
  return d.promise;
};

Rank.clear = function(cond) {
  var d = Q.defer();
  ranks.update(cond, {value: initialValue}, {multi:true}, function(err){
    if (err) {
      d.reject(err);
    } else {
      d.resolve();
    }
  });
  return d.promise;
};

Rank.remove = function(cond) {
  var d = Q.defer();
  ranks.remove(cond, function(err){
    if (err) {
      d.reject(err);
    } else {
      d.resolve();
    }
  });
  return d.promise;
};
