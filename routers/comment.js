
var router = require('express').Router();
var Q = require('q');
var xss = require('xss');

var IDs = require('../models/ids.js');
var Topic = require('../models/topic.js');
var Comment = require('../models/comment.js');

var Settings = require('../settings');
var xss_options = Settings.xss_options;

var Comm = require('../comm');
var ERR = Comm.ERR;
var FailProcess = Comm.FailProcess;

/*
 * 增加评论(帖子)
 */
router.post('/add', function(req, res){
  var name = req.session.user ? req.session.user.name : '';
  var tid = parseInt(req.body.tid, 10);
  var content = req.body.content;
  var fa = parseInt(req.body.fa, 10);
  var at = Comm.clearSpace(req.body.at);
  var now = (new Date()).getTime();
  var ret = ERR.SYS;
  Q.fcall(function(){
    if (!name) {
      ret = ERR.INVALID_SESSION;
      throw new Error('invalid session.');
    }
    if (!tid || !Comm.isString(content) || !content || !fa || name === at) {
      ret = ERR.ARGS;
      throw new Error('invalid args.');
    }
    return IDs.get('topicID');
  })
  .then(function(id){
    return [
      (new Comment({
        id: id,
        content: xss(content, xss_options),
        user: name,
        tid: tid,
        fa: fa,
        at: at,
        inDate: now
      })).save(),
      Topic.update(tid, {
        $set: {lastReviewer: name, lastReviewTime: now, lastComment: id},
        $inc: {reviewsQty: 1}
      })
    ];
  })
  .spread(function(){
    req.session.msg = 'add reply successfully.';
    return res.send({ret: ERR.OK});
  })
  .fail(function(err){
    FailProcess(err, res, ret);
  })
  .done();
});

/*
 * 删除评论(同时把此评论的子评论删掉)
 */
router.post('/del', function(req, res){
  var name = req.session.user ? req.session.user.name : '';
  var id = parseInt(req.body.id, 10);
  var ret = ERR.SYS;
  Q.fcall(function(){
    if (!name) {
      ret = ERR.INVALID_SESSION;
      throw new Error('invalid session.');
    }
    if (!id) {
      ret = ERR.ARGS;
      throw new Error('invalid args.');
    }
    var cond = {id: id};
    if (name !== 'admin') {
      cond.user = name;
    }
    return Comment.findOneAndRemove(cond);
  })
  .then(function(comment){
    if (!comment) {
      ret = ERR.ARGS;
      throw new Error('remove failed.');
    }
    var subCond = {fa: id};
    return [
      Comment.findLast({tid: comment.tid}),
      Topic.watch(comment.tid),
      Comment.remove(subCond)
    ];
  })
  .spread(function(comment, topic, res){
    if (!topic) {
      ret = ERR.NOT_EXIST;
      throw new Error('topic NOT exist.');
    }
    var val;
    if (comment && comment.inDate > topic.inDate) {
      val = {lastReviewer: comment.user, lastReviewTime: comment.inDate, lastComment: comment.id};
    } else {
      val = {lastReviewer: null, lastReviewTime: topic.inDate, lastComment: null};
    }
    return Topic.update(comment.tid, {
      $set: val,
      $inc: {reviewsQty: -(res.result.n+1)}
    });
  })
  .then(function(){
    return res.send({ret: ERR.OK, msg: 'remove successfully.'});
  })
  .fail(function(err){
    FailProcess(err, res, ret);
  })
  .done();
});

/*
 * 修改评论内容
 */
router.post('/edit', function(req, res){
  var name = req.session.user ? req.session.user.name : '';
  var id = parseInt(req.body.id, 10);
  var content = req.body.content;
  Q.fcall(function(){
    if (!req.session.user) {
      ret = ERR.INVALID_SESSION;
      throw new Error('invalid session.');
    }
    if (!id || !Comm.isString(content) || !content) {
      ret = ERR.ARGS;
      throw new Error('invalid args.');
    }
    var cond = {id: id};
    if (name !== 'admin') {
      cond.user = name;
    }
    return Comment.update(cond, {$set: {content: xss(content, xss_options)}})
  })
  .then(function(){
    return res.send({ret: ERR.OK, msg: 'update successfully.'});
  })
  .fail(function(err){
    FailProcess(err, res, ret);
  })
  .done();
});

module.exports = router;
