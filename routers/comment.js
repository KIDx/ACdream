
var router = require('express').Router();
var xss = require('xss');

var IDs = require('../models/ids.js');
var Topic = require('../models/topic.js');
var Comment = require('../models/comment.js');

var Settings = require('../settings');
var xss_options = Settings.xss_options;

var Comm = require('../comm');
var LogErr = Comm.LogErr;

/*
 * 增加评论(帖子)
 */
router.post('/add', function(req, res){
  res.header('Content-Type', 'text/plain');
  if (!req.session.user) {
    req.session.msg = '请先登录！';
    return res.end();
  }
  var user = req.session.user.name;
  var tid = parseInt(req.body.tid, 10);
  var content = req.body.content;
  var fa = parseInt(req.body.fa, 10);
  var at = req.body.at;
  if (!user || !tid || !content || !fa || user == at) {
    return res.end();   //not allow!
  }
  IDs.get('topicID', function(err, id){
    if (err) {
      LogErr(err);
      return res.end('3');
    }
    var now = (new Date()).getTime();
    (new Comment({
      id: id,
      content: xss(content, xss_options),
      user: user,
      tid: tid,
      fa: fa,
      at: at,
      inDate: now
    })).save()
    .then(function(){
      return Topic.update(tid, {
        $set: {lastReviewer: user, lastReviewTime: now, lastComment: id},
        $inc: {reviewsQty: 1}
      });
    })
    .then(function(){
      req.session.msg = '回复成功！';
      return res.end();
    })
    .fail(function(){
      LogErr(err);
      res.end('3');
    });
  });
});

/*
 * 删除评论(同时把此评论的子评论删掉)
 */
router.post('/del', function(req, res){
  res.header('Content-Type', 'text/plain');
  if (!req.session.user) {
    req.session.msg = '请先登录！';
    return res.end();
  }
  var id = parseInt(req.body.id, 10);
  if (!id) {
    return res.end();   //not allow
  }
  var cond = { id: id }, subCond = { fa: id };
  if (req.session.user.name != 'admin') {
    cond.user = req.session.user.name;
  }
  var tid, cnt;
  Comment.findOneAndRemove(cond)
  .then(function(comment){
    if (!comment) {
      throw new Error('404');
    }
    tid = comment.tid;
    return Comment.count(subCond);
  })
  .then(function(count){
    cnt = count;
    return Comment.remove(subCond);
  })
  .then(function(){
    return [Comment.findLast({tid: tid}), Topic.watch(tid)];
  })
  .spread(function(comment, topic){
    var set;
    if (comment && comment.inDate > topic.inDate) {
      set = {lastReviewer: comment.user, lastReviewTime: comment.inDate, lastComment: comment.id};
    } else {
      set = {lastReviewer: null, lastReviewTime: topic.inDate, lastComment: null};
    }
    return Topic.update(comment.tid, {
      $set: set,
      $inc: {reviewsQty: -(cnt+1)}
    });
  })
  .then(function(){
    return res.end();
  })
  .fail(function(err){
    if (err.message == '404') {
      return res.end();
    }
    LogErr(err);
    return res.end('3');
  });
});

/*
 * 修改评论内容
 */
router.post('/edit', function(req, res){
  res.header('Content-Type', 'text/plain');
  if (!req.session.user) {
    req.session.msg = '请先登录！';
    return res.end();
  }
  var id = parseInt(req.body.id, 10)
  ,   content = req.body.content;
  if (!id || !content) {
    return res.end();   //not allow
  }
  var Q = { id: id };
  if (req.session.user.name != 'admin') {
    Q.user = req.session.user.name;
  }
  Comment.update(Q, {$set: {content: xss(content, xss_options)}})
  .then(function(){
    return res.end();
  })
  .fail(function(err){
    LogErr(err);
    return res.end('3');
  });
});

module.exports = router;
