
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Settings = require('../settings');
var pageNum = Settings.contestRank_pageNum;
var initialValue = { penalty: 0, solved: 0, submitTime: 0 };
var Comm = require('../comm');
var LogErr = Comm.LogErr;

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

Rank.prototype.save = function(callback) {
  //存入 Mongodb 的文档
  rank = new ranks();
  rank.value = initialValue;
  rank._id = new Object({ name: this.name, cid: this.cid });
  rank.save(function(err){
    if (err) {
      LogErr('Rank.save failed!');
    }
    return callback(err);
  });
};

Rank.findOne = function(Q, callback) {
  ranks.findOne(Q, function(err, doc){
    if (err) {
      LogErr('Rank.fineOne failed!');
    }
    return callback(err, doc);
  });
};

Rank.get = function(Q, page, callback) {
  ranks.count(Q, function(err, count){
    if ((page-1)*pageNum > count) {
      return callback(null, null, -1);
    }
    ranks.find(Q).sort({
      'value.solved': -1,
      'value.penalty': 1,
      'value.submitTime': -1,
      '_id.name': 1
    }).skip((page-1)*pageNum).limit(pageNum).exec(function(err, docs) {
      if (err) {
        LogErr('Rank.get failed!');
      }
      return callback(err, docs, parseInt((count+pageNum-1)/pageNum, 10));
    });
  });
};

Rank.getAll = function(Q, callback) {
  ranks.find(Q).sort({
    'value.solved': -1,
    'value.penalty': 1,
    'value.submitTime': -1,
    '_id.name': 1
  }).exec(function(err, docs){
    if (err) {
      LogErr('Rank.getAll failed!');
    }
    return callback(err, docs);
  });
};

Rank.count = function(Q, callback) {
  ranks.count(Q, function(err, count){
    if (err) {
      LogErr('Rank.count failed!');
    }
    return callback(err, count);
  });
};

Rank.clear = function(Q, callback) {
  ranks.update(Q, {value: initialValue}, {multi:true}, function(err){
    if (err) {
      LogErr('Rank.clear failed!');
    }
    return callback(err);
  });
};

Rank.remove = function(Q, callback) {
  ranks.remove(Q, function(err){
    if (err) {
      LogErr('Rank.remove failed!');
    }
    return callback(err);
  });
};
