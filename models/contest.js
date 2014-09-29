
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Settings = require('../settings');
var pageNum = Settings.contest_pageNum;
var Comm = require('../comm');
var LogErr = Comm.LogErr;

function Contest(contest) {
  this.contestID = contest.contestID;
  this.userName = contest.userName,
  this.title = contest.title;
  this.startTime = contest.startTime;
  this.len = contest.len;
  this.penalty = contest.penalty;
  this.description = contest.description;
  this.msg = contest.msg;
  this.probs = contest.probs;
  this.password = contest.password;
  this.open_reg = contest.open_reg;
  this.type = contest.type;
  this.family = contest.family;
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
  open_reg: Boolean,
  type: Number,
  family: String,
  contestants: Array,
  stars: Array,
  updateTime: Number,
  maxRunID: Number,
  penalty: Number,
  overviewUpdateTime: Number,
  overviewRunID: Number,
  FB: Object
});

contestObj.index({startTime: -1, contestID: -1});

mongoose.model('contests', contestObj);
var contests = mongoose.model('contests');

Contest.prototype.save = function(callback) {
  contest = new contests();
  contest.contestID = this.contestID;
  contest.userName = this.userName;
  contest.title = this.title;
  contest.startTime = this.startTime;
  contest.len = this.len;
  contest.penalty = this.penalty;
  contest.description = this.description;
  contest.msg = this.msg;
  contest.probs = this.probs;
  contest.password = this.password;
  contest.open_reg = this.open_reg;
  contest.type = this.type;
  if (contest.type === 2) {
    contest.family = this.family;
  }
  contest.contestants = new Array();
  contest.stars = new Array();
  contest.updateTime = 0;
  contest.maxRunID = 0;
  contest.overviewUpdateTime = 0;
  contest.overviewRunID = 0;
  contest.save(function(err){
    if (err) {
      LogErr('Contest.save failed!');
    }
    return callback(err);
  });
};

Contest.find = function(Q, callback) {
  contests.find(Q, function(err, docs){
    if (err) {
      LogErr('Contest.find failed!');
    }
    return callback(err, docs);
  });
};

Contest.get = function(Q, page, callback) {
  contests.count(Q, function(err, count){
    if ((page-1)*pageNum > count) {
      return callback(null, null, -1);
    }
    contests.find(Q).sort({startTime: -1, contestID: -1}).skip((page-1)*pageNum)
      .limit(pageNum).exec(function(err, docs){
      if (err) {
        LogErr('Contest.get failed!');
      }
      return callback(err, docs, parseInt((count+pageNum-1)/pageNum, 10));
    });
  });
};

Contest.watch = function(cid, callback) {
  contests.findOne({contestID: cid}, function(err, doc){
    if (err) {
      LogErr('Contest.watch failed!');
    }
    return callback(err, doc);
  });
};

Contest.findOneAndUpdate = function(Q, H, O, callback) {
  contests.findOneAndUpdate(Q, H, O, function(err, doc){
    if (err) {
      LogErr('Contest.findOneAndUpdate failed!');
    }
    return callback(err, doc);
  });
};

Contest.update = function(cid, H, callback) {
  contests.update({contestID: cid}, H, function(err){
    if (err) {
      LogErr('Contest.update failed!');
    }
    return callback(err);
  });
};

Contest.multiUpdate = function(Q, H, callback) {
  contests.update(Q, H, {multi: true}, function(err){
    if (err) {
      LogErr('Contest.multiUpdate failed!');
    }
    return callback(err);
  });
};

Contest.remove = function(cid, callback) {
  contests.remove({contestID: cid}, function(err){
    if (err) {
      LogErr('Contest.remove failed!');
    }
    return callback(err);
  });
};

Contest.topFive = function(Q, callback) {
  contests.find(Q).sort({startTime:-1, contestID: -1})
    .limit(5).exec(function(err, docs){
    if (err) {
      LogErr('Contest.topFive failed!');
    }
    return callback(err, docs);
  });
};
