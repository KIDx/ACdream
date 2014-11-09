
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Settings = require('../settings');
var limit = Settings.comment_limit;
var Comm = require('../comm');
var LogErr = Comm.LogErr;

function Comment(comment) {
  this.id = comment.id;
  this.content = comment.content;
  this.user = comment.user;
  this.tid = comment.tid;
  this.fa = comment.fa;
  this.at = comment.at;
  this.inDate = comment.inDate;
};

module.exports = Comment;

var commentObj = new Schema({
  id: {type: Number, index: {unique: true}},
  content: String,
  user: String,
  tid: Number,
  fa: Number,
  at: String,
  inDate: Number,
  hide: Boolean
});

commentObj.index({tid: 1, id: 1});

mongoose.model('comments', commentObj);
var comments = mongoose.model('comments');

Comment.prototype.save = function(callback) {
  comment = new comments();
  comment.id = this.id;
  comment.content = this.content;
  comment.user = this.user;
  comment.tid = this.tid;
  comment.fa = this.fa;
  comment.at = this.at;
  comment.inDate = this.inDate;
  comment.hide = false;
  comment.save(function(err){
    if (err) {
      LogErr('Comment.save failed!');
    }
    return callback(err);
  });
};

Comment.get = function(Q, callback){
  comments.find(Q).sort({id: -1}).limit(limit).exec(function(err, docs){
    if (err) {
      LogErr('Comment.get failed!');
    }
    return callback(err, docs);
  });
};

Comment.watch = function(tid, callback) {
  comments.findOne({id: tid}, function(err, doc){
    if (err) {
      LogErr('Comment.watch failed!');
    }
    return callback(err, doc);
  });
};

Comment.update = function(Q, H, callback) {
  comments.update(Q, H, function(err){
    if (err) {
      LogErr('Comment.update failed!');
    }
    return callback(err);
  });
};

Comment.findOneAndRemove = function(Q, callback) {
  comments.findOneAndRemove(Q, function(err, doc){
    if (err) {
      LogErr('Comment.findOneAndRemove failed!');
    }
    return callback(err, doc);
  });
};

Comment.count = function(Q, callback) {
  comments.count(Q, function(err, cnt){
    if (err) {
      LogErr('Comment.count failed!');
    }
    return callback(err, cnt);
  });
};

Comment.remove = function(Q, callback) {
  comments.remove(Q, function(err){
    if (err) {
      LogErr('Comment.remove failed!');
    }
    return callback(err);
  });
};

Comment.findLast = function(Q, callback) {
  comments.findOne(Q).sort({inDate: -1}).exec(function(err, doc){
    if (err) {
      LogErr('Comment.findLast failed!');
    }
    return callback(err, doc);
  });
};
