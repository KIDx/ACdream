
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
  var content = String(req.body.content); //can not do clearSpace because it is content
  var fa = parseInt(req.body.fa, 10);
  var at = Comm.clearSpace(req.body.at);
  if (!user || !tid || !content || !fa) {
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
    })).save(function(err){
      if (err) {
        LogErr(err);
        return res.end('3');
      }
      Topic.update(tid, {
        $set: {lastReviewer: user, lastReviewTime: now, lastComment: id},
        $inc: {reviewsQty: 1}
      }, function(err){
        if (err) {
          LogErr(err);
          return res.end('3');
        }
        req.session.msg = '回复成功！';
        return res.end();
      });
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
  var q = { id: id };
  if (req.session.user.name != 'admin') {
    q.user = req.session.user.name;
  }
  Comment.findOneAndRemove(q, function(err, comment){
    if (err) {
      LogErr(err);
      return res.end('3');
    }
    if (!comment) {
      return res.end();   //not allow
    }
    var Q = { fa: comment.id };
    Comment.count(Q, function(err, cnt){
      if (err) {
        LogErr(err);
        return res.end('3');
      }
      Comment.remove(Q, function(err){
        if (err) {
          LogErr(err);
          return res.end('3');
        }
        Comment.findLast({tid: comment.tid}, function(err, com){
          if (err) {
            LogErr(err);
            return res.end('3');
          }
          Topic.watch(comment.tid, function(err, topic){
            if (err) {
              LogErr(err);
              return res.end('3');
            }
            var set;
            if (com && com.inDate > topic.inDate) {
              set = {lastReviewer: com.user, lastReviewTime: com.inDate, lastComment: com.id};
            } else {
              set = {lastReviewer: null, lastReviewTime: topic.inDate, lastComment: null};
            }
            Topic.update(comment.tid, {
              $set: set,
              $inc: {reviewsQty: -(cnt+1)}
            }, function(err){
              if (err) {
                LogErr(err);
                return res.end('3');
              }
              req.session.msg = '删除成功！';
              return res.end();
            });
          });
        });
      });
    });
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
  ,   content = String(req.body.content);
  if (!id || !content) {
    return res.end();   //not allow
  }
  var Q = { id: id };
  if (req.session.user.name != 'admin') {
    Q.user = req.session.user.name;
  }
  Comment.update(Q, {$set: {content: xss(content, xss_options)}}, function(err){
    if (err) {
      LogErr(err);
      return res.end('3');
    }
    req.session.msg = '修改成功！';
    return res.end();
  });
});

module.exports = router;
