
var Q = require('q');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Settings = require('../settings');
var pageNum = Settings.contest_pageNum;

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

Contest.prototype.save = function() {
  var d = Q.defer();
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
      d.reject(err);
    } else {
      d.resolve();
    }
  });
  return d.promise;
};

Contest.find = function(cond) {
  var d = Q.defer();
  contests.find(cond, function(err, docs){
    if (err) {
      d.reject(err);
    } else {
      d.resolve(docs);
    }
  });
  return d.promise;
};

Contest.get = function(cond, page) {
  var d = Q.defer();
  contests.count(cond, function(err, count){
    if ((page-1)*pageNum > count) {
      return d.resolve({
        contests: [],
        totalPage: 1
      });
    }
    contests.find(cond).sort({startTime: -1, contestID: -1}).skip((page-1)*pageNum)
      .limit(pageNum).exec(function(err, docs){
      if (err) {
        d.reject(err);
      } else {
        d.resolve({
          contests: docs,
          totalPage: Math.floor((count+pageNum-1)/pageNum)
        });
      }
    });
  });
  return d.promise;
};

Contest.watch = function(cid) {
  var d = Q.defer();
  contests.findOne({contestID: cid}, function(err, doc){
    if (err) {
      d.reject(err);
    } else {
      d.resolve(doc);
    }
  });
  return d.promise;
};

Contest.findOneAndUpdate = function(cond, val, opt) {
  var d = Q.defer();
  contests.findOneAndUpdate(cond, val, opt, function(err, doc){
    if (err) {
      d.reject(err);
    } else {
      d.resolve(doc);
    }
  });
  return d.promise;
};

Contest.update = function(cid, val) {
  var d = Q.defer();
  contests.update({contestID: cid}, val, function(err){
    if (err) {
      d.reject(err);
    } else {
      d.resolve();
    }
  });
  return d.promise;
};

Contest.multiUpdate = function(cond, val) {
  var d = Q.defer();
  contests.update(cond, val, {multi: true}, function(err){
    if (err) {
      d.reject(err);
    } else {
      d.resolve();
    }
  });
  return d.promise;
};

Contest.remove = function(cid) {
  var d = Q.defer();
  contests.remove({contestID: cid}, function(err){
    if (err) {
      d.reject(err);
    } else {
      d.resolve();
    }
  });
  return d.promise;
};

Contest.topFive = function(cond) {
  var d = Q.defer();
  contests.find(cond).sort({startTime:-1, contestID: -1})
    .limit(5).exec(function(err, docs){
    if (err) {
      d.reject(err);
    } else {
      d.resolve(docs);
    }
  });
  return d.promise;
};
