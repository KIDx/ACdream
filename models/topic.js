
var Q = require('q');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Settings = require('../settings');
var pageNum = Settings.topic_pageNum;

function Topic(topic) {
  this.id = topic.id;
  this.title = topic.title;
  this.content = topic.content;
  this.user = topic.user;
  this.cid = topic.cid;
  this.inDate = topic.inDate;
};

module.exports = Topic;

var topicObj = new Schema({
  id: {type: Number, index: {unique: true}},
  title: String,
  content: String,
  user: String,
  cid: Number,
  inDate: Number,
  reviewsQty: Number,
  browseQty: Number,
  top: Boolean,
  lastReviewer: String,
  lastReviewTime: Number,
  lastComment: Number
});

topicObj.index({lastReviewTime: -1});
topicObj.index({top: -1, lastReviewTime: -1});

mongoose.model('topics', topicObj);
var topics = mongoose.model('topics');

Topic.prototype.save = function() {
  var d = Q.defer();
  topic = new topics();
  topic.id = this.id;
  topic.title = this.title;
  topic.content = this.content;
  topic.user = this.user;
  topic.cid = this.cid;
  topic.lastReviewTime = topic.inDate = this.inDate;
  topic.reviewsQty = topic.browseQty = 0;
  topic.top = false;
  topic.save(function(err){
    if (err) {
      d.reject(err);
    } else {
      d.resolve();
    }
  });
  return d.promise;
};

Topic.get = function(cond, page, notSortByTop) {
  var d = Q.defer();
  topics.count(cond, function(err, count){
    if ((page-1)*pageNum > count) {
      return d.resolve({
        topics: [],
        totalPage: 1
      });
    }
    var sq = {};
    if (!notSortByTop) {
      sq.top = -1;
    }
    sq.lastReviewTime = -1;
    topics.find(cond).sort(sq).skip((page-1)*pageNum)
      .limit(pageNum).exec(function(err, docs){
      if (err) {
        d.reject(err);
      } else {
        d.resolve({
          topics: docs,
          totalPage: Math.floor((count+pageNum-1)/pageNum)
        });
      }
    });
  });
  return d.promise;
};

Topic.watch = function(tid) {
  var d = Q.defer();
  topics.findOne({id: tid}, function(err, doc){
    if (err) {
      d.reject(err);
    } else {
      d.resolve(doc);
    }
  });
  return d.promise;
};

Topic.update = function(tid, val) {
  var d = Q.defer();
  topics.update({id: tid}, val, function(err){
    if (err) {
      d.reject(err);
    } else {
      d.resolve();
    }
  });
  return d.promise;
};
