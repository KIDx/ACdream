
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Settings = require('../settings');
var pageNum = Settings.topic_pageNum;
var Comm = require('../comm');
var LogErr = Comm.LogErr;

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

Topic.prototype.save = function(callback) {
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
      LogErr('Topic.save failed!');
    }
    return callback(err);
  });
};

Topic.get = function(Q, page, callback) {
  topics.count(Q, function(err, count){
    if ((page-1)*pageNum > count) {
      return callback(null, null, -1);
    }
    topics.find(Q).sort({top: -1, lastReviewTime: -1}).skip((page-1)*pageNum)
      .limit(pageNum).exec(function(err, docs){
      if (err) {
        LogErr('Topic.get failed!');
      }
      return callback(err, docs, parseInt((count+pageNum-1)/pageNum, 10));
    });
  });
};

Topic.watch = function(tid, callback) {
  topics.findOne({id: tid}, function(err, doc){
    if (err) {
      LogErr('Topic.watch failed!');
    }
    return callback(err, doc);
  });
};

Topic.update = function(tid, H, callback) {
  topics.update({id: tid}, H, function(err){
    if (err) {
      LogErr('Topic.update failed!');
    }
    return callback(err);
  });
};
