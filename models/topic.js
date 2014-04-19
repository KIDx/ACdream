
var mongoose = require('mongoose')
,   Schema = mongoose.Schema
,   settings = require('../settings')
,   pageNum = settings.topic_pageNum
,   OE = settings.outputErr;

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
  top: Boolean
});

mongoose.model('topics', topicObj);
var topics = mongoose.model('topics');

Topic.prototype.save = function(callback) {
  topic = new topics();
  topic.id = this.id;
  topic.title = this.title;
  topic.content = this.content;
  topic.user = this.user;
  topic.cid = this.cid;
  topic.inDate = this.inDate;
  topic.reviewsQty = topic.browseQty = 0;
  topic.top = false;
  topic.save(function(err){
    if (err) {
      OE('Topic.save failed!');
    }
    return callback(err);
  });
};

Topic.get = function(Q, page, callback) {
  topics.count(Q, function(err, count){
    if ((page-1)*pageNum > count) {
      return callback(null, null, -1);
    }
    topics.find(Q).sort({top:-1, inDate:-1}).skip((page-1)*pageNum).limit(pageNum).exec(function(err, docs){
      if (err) {
        OE('Topic.get failed!');
      }
      return callback(err, docs, parseInt((count+pageNum-1)/pageNum, 10));
    });
  });
};

Topic.watch = function(tid, callback) {
  topics.findOne({id:tid}, function(err, doc){
    if (err) {
      OE('Topic.watch failed!');
    }
    return callback(err, doc);
  });
};

Topic.update = function(tid, H, callback) {
  topics.update({id:tid}, H, function(err){
    if (err) {
      OE('Topic.update failed!');
    }
    return callback(err);
  });
};

Topic.topFive = function(Q, callback) {
  topics.find(Q).sort({inDate: -1}).limit(5).exec(function(err, docs){
    if (err) {
      OE('Topic.topFive failed!');
    }
    return callback(err, docs);
  });
};