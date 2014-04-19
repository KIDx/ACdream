
var mongoose = require('mongoose')
,   Schema = mongoose.Schema
,   settings = require('../settings')
,   pageNum = settings.contest_pageNum
,   OE = settings.outputErr;

function Contest(contest) {
  this.contestID = contest.contestID;
  this.userName = contest.userName,
  this.title = contest.title;
  this.startTime = contest.startTime;
  this.len = contest.len;
  this.description = contest.description;
  this.msg = contest.msg;
  this.probs = contest.probs;
  this.password = contest.password;
  this.type = contest.type;
};

module.exports = Contest;

var contestObj = new Schema({
  contestID: {type: Number, index: {unique: true}},
  userName: String,
  title: String,
  startTime: Number,
  len: Number,
  description: String,
  msg: String,
  probs: Array,
  password: String,
  type: Number,
  contestants: Array,
  stars: Array,
  updateTime: Number,
  maxRunID: Number,
  FB: Object
});

mongoose.model('contests', contestObj);
var contests = mongoose.model('contests');

Contest.prototype.save = function(callback) {
  contest = new contests();
  contest.contestID = this.contestID;
  contest.userName = this.userName;
  contest.title = this.title;
  contest.startTime = this.startTime;
  contest.len = this.len;
  contest.description = this.description;
  contest.msg = this.msg;
  contest.probs = this.probs;
  contest.password = this.password;
  contest.type = this.type;
  contest.contestants = new Array();
  contest.stars = new Array();
  contest.updateTime = 0;
  contest.maxRunID = 0;
  contest.save(function(err){
    if (err) {
      OE('Contest.save failed!');
    }
    return callback(err);
  });
};

Contest.find = function(Q, callback) {
  contests.find(Q, function(err, docs){
    if (err) {
      OE('Contest.find failed!');
    }
    return callback(err, docs);
  });
};

Contest.get = function(Q, page, callback) {
  contests.count(Q, function(err, count){
    if ((page-1)*pageNum > count) {
      return callback(null, null, -1);
    }
    contests.find(Q).sort({startTime:-1, contestID:-1}).skip((page-1)*pageNum).limit(pageNum).exec(function(err, docs){
      if (err) {
        OE('Contest.get failed!');
      }
      return callback(err, docs, parseInt((count+pageNum-1)/pageNum, 10));
    });
  });
};

Contest.watch = function(cid, callback) {
  contests.findOne({contestID:cid}, function(err, doc){
    if (err) {
      OE('Contest.watch failed!');
    }
    return callback(err, doc);
  });
};

Contest.findOneAndUpdate = function(Q, H, O, callback) {
  contests.findOneAndUpdate(Q, H, O, function(err, doc){
    if (err) {
      OE('Contest.findOneAndUpdate failed!');
    }
    return callback(err, doc);
  });
};

Contest.update = function(cid, H, callback) {
  contests.update({contestID:cid}, H, function(err){
    if (err) {
      OE('Contest.update failed!');
    }
    return callback(err);
  });
};

Contest.multiUpdate = function(Q, H, callback) {
  contests.update(Q, H, {multi: true}, function(err){
    if (err) {
      OE('Contest.multiUpdate failed!');
    }
    return callback(err);
  });
};

Contest.remove = function(cid, callback) {
  contests.remove({contestID: cid}, function(err){
    if (err) {
      OE('Contest.remove failed!');
    }
    return callback(err);
  });
};

Contest.topFive = function(Q, callback) {
  contests.find(Q).sort({contestID: -1}).limit(5).exec(function(err, docs){
    if (err) {
      OE('Contest.topFive failed!');
    }
    return callback(err, docs);
  });
};