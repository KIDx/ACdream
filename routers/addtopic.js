
var router = require('express').Router();
var xss = require('xss');
var verifyCode = require('verify-code');

var IDs = require('../models/ids.js');
var Topic = require('../models/topic.js');

var KEY = require('./key');
var Settings = require('../settings');
var xss_options = Settings.xss_options;
var Comm = require('../comm');
var LogErr = Comm.LogErr;
var clearSpace = Comm.clearSpace;

/*
 * get: addtopic页面
 * post: 增加或修改一个topic
 */
router.route('/')
.get(function(req, res){
  if (!req.session.user) {
    req.session.msg = '请先登录！';
    return res.redirect('/topic/list');
  }
  var RP = function(T, type) {
    if (T) {
      T.content = Comm.escapeHtml(T.content);
    }
    var info = verifyCode.Generate();
    req.session.verifycode = info.code;
    res.render('addtopic', {
      title: type + 'Topic',
      topic: T,
      key: KEY.ADD_TOPIC,
      dataURL: info.dataURL
    });
  };
  var tid = parseInt(req.query.tid, 10);
  if (!tid) {
    return RP(null, 'Add');
  } else {
    var user = req.session.user.name;
    Topic.watch(tid, function(err, topic){
      if (err) {
        LogErr(err);
        req.session.msg = '系统错误！';
        return res.redirect('/');
      }
      if (user != 'admin' && user != topic.user) {
        req.session.msg = '抱歉，您不是该话题的主人，无法进入编辑！';
        return res.redirect('/topic/list');
      }
      return RP(topic, 'Edit');
    });
  }
})
.post(function(req, res){
  res.header('Content-Type', 'text/plain');
  if (!req.session.user) {
    req.session.msg = '请先登录！';
    return res.end();
  }
  var tid = parseInt(req.body.tid, 10);
  var title = clearSpace(req.body.title);
  var content = req.body.content; //can not do clearSpace because it is content
  var name = req.session.user.name;
  var cid = parseInt(req.body.cid, 10);
  if (!title || !content || !name) {
    return res.end();   //not allow!
  }
  if (!cid) {
    cid = -1;
  }
  if (tid) {
    var RP = function() {
      var now = (new Date()).getTime();
      Topic.update(tid, {$set: {
        title: title,
        content: xss(content, xss_options),
        inDate: now,
        lastReviewer: null,
        lastReviewTime: now
      }}, function(err){
        if (err) {
          LogErr(err);
          return res.end('2');    //not refresh for error
        }
        req.session.msg = '修改成功！';
        return res.end(tid.toString());
      });
    };
    if (name == 'admin') {
      return RP();
    }
    Topic.watch(tid, function(err, topic){
      if (err) {
        LogErr(err);
        return res.end('2');
      }
      if (!topic) {
        return res.end();  //not allow
      }
      if (topic.user != name) {
        req.session.msg = '抱歉，您不是该话题的主人，无权修改！';
        return res.end();
      }
      return RP();
    });
  } else {
    var vcode = clearSpace(req.body.vcode);
    if (!vcode) {
      return res.end();   //not allow
    }
    if (vcode.toLowerCase() != req.session.verifycode) {
      return res.end('1');
    }
    IDs.get('topicID', function(err, id){
      if (err) {
        LogErr(err);
        return res.end('2');
      }
      (new Topic({
        id: id,
        title: title,
        content: xss(content, xss_options),
        cid: cid,
        user: req.session.user.name,
        inDate: (new Date()).getTime()
      })).save(function(err){
        if (err) {
          LogErr(err);
          return res.end('2');
        }
        req.session.msg = '发布成功！';
        return res.end(id.toString());
      });
    });
  }
});

module.exports = router;
