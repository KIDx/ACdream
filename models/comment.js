
var Q = require('q');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Settings = require('../settings');
var limit = Settings.comment_limit;

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

Comment.prototype.save = function() {
  var d = Q.defer();
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
      d.reject(err);
    } else {
      d.resolve();
    }
  });
  return d.promise;
};

Comment.find = function(cond) {
  var d = Q.defer();
  comments.find(cond).sort({id: 1}).exec(function(err, docs){
    if (err) {
      d.reject(err);
    } else {
      d.resolve(docs);
    }
  });
  return d.promise;
};

Comment.get = function(cond) {
  var d = Q.defer();
  comments.find(cond).sort({id: -1}).limit(limit).exec(function(err, docs){
    if (err) {
      d.reject(err);
    } else {
      d.resolve(docs);
    }
  });
  return d.promise;
};

Comment.findOne = function(cond) {
  var d = Q.defer();
  comments.findOne(cond, function(err, doc){
    if (err) {
      d.reject(err);
    } else {
      d.resolve(doc);
    }
  });
  return d.promise;
};

Comment.update = function(cond, val) {
  var d = Q.defer();
  comments.update(cond, val, function(err){
    if (err) {
      d.reject(err);
    } else {
      d.resolve();
    }
  });
  return d.promise;
};

Comment.findOneAndRemove = function(cond) {
  var d = Q.defer();
  comments.findOneAndRemove(cond, function(err, doc){
    if (err) {
      d.reject(err);
    } else {
      d.resolve(doc);
    }
  });
  return d.promise;
};

Comment.count = function(cond) {
  var d = Q.defer();
  comments.count(cond, function(err, cnt){
    if (err) {
      d.reject(err);
    } else {
      d.resolve(cnt);
    }
  });
  return d.promise;
};

Comment.remove = function(cond) {
  var d = Q.defer();
  comments.remove(cond, function(err){
    if (err) {
      d.reject(err);
    } else {
      d.resolve();
    }
  });
  return d.promise;
};

Comment.findLast = function(cond) {
  var d = Q.defer();
  comments.findOne(cond).sort({id: -1}).exec(function(err, doc){
    if (err) {
      d.reject(err);
    } else {
      d.resolve(doc);
    }
  });
  return d.promise;
};
