
var mongoose = require('mongoose')
,   Schema = mongoose.Schema
,   settings = require('../settings')
,   pageNum = settings.contestRank_pageNum
,   OE = settings.outputErr;

function Rank(cid, name) {
  this.cid = cid;
  this.name = name;
};

module.exports = Rank;

var rankObj = new Schema({
  _id: {type: Object, index: {unique: true}},
  value: Object
});

mongoose.model('ranks', rankObj);
var ranks = mongoose.model('ranks');

Rank.prototype.save = function(callback) {
  //存入 Mongodb 的文档
  rank = new ranks();
  rank.value = {penalty:0, solved:0};
  rank._id = new Object({name: this.name, cid: this.cid});
  rank.save(function(err){
    if (err) {
      OE('Rank.save failed!');
    }
    return callback(err);
  });
};

Rank.findOne = function(Q, callback) {
  ranks.findOne(Q, function(err, doc){
    if (err) {
      OE('Rank.fineOne failed!');
    }
    return callback(err, doc);
  });
};

Rank.get = function(Q, page, callback) {
  ranks.count(Q, function(err, count){
    if ((page-1)*pageNum > count) {
      return callback(null, null, -1);
    }
    ranks.find(Q).sort({'value.solved':-1, 'value.penalty':1, '_id.name':1})
    .skip((page-1)*pageNum).limit(pageNum).exec(function(err, docs) {
      if (err) {
        OE('Rank.get failed!');
      }
      return callback(err, docs, parseInt((count+pageNum-1)/pageNum, 10));
    });
  });
};

Rank.count = function(Q, callback) {
  ranks.count(Q, function(err, count){
    if (err) {
      OE('Rank.count failed!');
    }
    return callback(err, count);
  });
};

Rank.update = function(Q, H, callback) {
  ranks.update(Q, H, {multi:true}, function(err){
    if (err) {
      OE('Rank.update failed!');
    }
    return callback(err);
  });
};

Rank.remove = function(Q, callback) {
  ranks.remove(Q, function(err){
    if (err) {
      OE('Rank.remove failed!');
    }
    return callback(err);
  });
};