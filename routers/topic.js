
var router = require('express').Router();
var xss = require('xss');

var User = require('../models/user.js');
var Topic = require('../models/topic.js');
var Comment = require('../models/comment.js');

var KEY = require('./key');
var Settings = require('../settings');
var xss_options = Settings.xss_options;
var Comm = require('../comm');
var getTime = Comm.getTime;
var LogErr = Comm.LogErr;

/*
 * 显示一个帖子的页面
 */
router.get('/', function(req, res) {
  var tid = parseInt(req.query.tid, 10);
  if (!tid) {
    return res.redirect('/404');
  }
  Topic.watch(tid, function(err, topic){
    if (err) {
      LogErr(err);
      req.session.msg = '系统错误！';
      return res.redirect('/');
    }
    if (!topic) {
      return res.redirect('/404');
    }
    Topic.update(tid, {$inc: {browseQty: 1}}, function(err){
      if (err) {
        LogErr(err);
        req.session.msg = '系统错误！';
        return res.redirect('/');
      }
      Comment.get({tid: topic.id}, function(err, comments){
        if (err) {
          LogErr(err);
          req.session.msg = '系统错误！';
          return res.redirect('/');
        }
        var names = new Array(), has = {}, com = new Array(), sub = {}, N = 0;
        if (comments) {
          N = comments.length;
          comments.forEach(function(p){
            if (!has[p.user]) {
              names.push(p.user);
              has[p.user] = true;
            }
            if (p.fa == -1) {
              com.push(p);
            } else {
              if (!sub[p.fa]) {
                sub[p.fa] = new Array();
              }
              sub[p.fa].push(p);
            }
          });
        }
        if (!has[topic.user]) {
          names.push(topic.user);
        }
        User.find({name: {$in: names}}, function(err, users){
          if (err) {
            LogErr(err);
            req.session.msg = '系统错误！';
            return res.redirect('/');
          }
          var UT = {}, UC = {}, IT = {};
          if (users) {
            users.forEach(function(p){
              UT[p.name] = Comm.userTit(p.rating);
              UC[p.name] = Comm.userCol(p.rating);
              IT[p.name] = p.imgType;
            });
          }
          res.render('topic', {
            title: topic.title,
            key: KEY.TOPIC,
            topic: topic,
            comments: com,
            N: N,
            sub: sub,
            getDate: getTime,
            UT: UT,
            UC: UC,
            IT: IT
          });
        });
      });
    });
  });
});

/*
 * 显示帖子列表的页面
 */
router.get('/list', function(req, res){
  if (!req.query.page) {
    page = 1;
  } else {
    page = parseInt(req.query.page, 10);
  }
  if (!page || page < 0) {
    return res.redirect('/topic/list');
  }
  var search = req.query.search, q1 = {cid: -1}, q2 = {cid: -1};

  if (search) {
    q1.title = q2.user = new RegExp("^.*"+Comm.toEscape(search)+".*$", 'i');
  }
  Topic.get({$or:[q1, q2]}, page, function(err, topics, n){
    if (err) {
      LogErr(err);
      req.session.msg = '系统错误！';
      return res.redirect('/');
    }
    if (n < 0) {
      return res.redirect('/topic/list');
    }
    var names = new Array(), I = {}, has = {};
    if (topics) {
      topics.forEach(function(p){
        if (!has[p.user]) {
          names.push(p.user);
          has[p.user] = true;
        }
        if (p.lastReviewer && !has[p.lastReviewer]) {
          names.push(p.lastReviewer);
          has[p.lastReviewer] = true;
        }
      });
    }
    User.find({name: {$in: names}}, function(err, users){
      if (err) {
        LogErr(err);
        req.session.msg = '系统错误！';
        return res.redirect('/');
      }
      if (users) {
        users.forEach(function(p){
          I[p.name] = p.imgType;
        });
      }
      res.render('topiclist', {
        title: 'TopicList',
        key: KEY.TOPIC_LIST,
        topics: topics,
        page: page,
        search: search,
        n: n,
        I: I,
        getDate: getTime
      });
    });
  });
});

/*
 * 切换置顶状态
 */
router.post('/toggleTop', function(req, res){
  res.header('Content-Type', 'text/plain');
  if (!req.session.user || req.session.user.name != 'admin') {
    return res.end();  //not allow!
  }
  var tid = parseInt(req.body.tid, 10);
  if (!tid) {
    return res.end();  //not allow!
  }
  Topic.watch(tid, function(err, topic){
    if (err) {
      LogErr(err);
      req.session.msg = '系统错误！';
      return res.end();
    }
    if (!topic) {
      return res.end(); //not allow!
    }
    topic.top = !topic.top;
    topic.save(function(err){
      if (err) {
        LogErr(err);
        req.session.msg = '系统错误！';
        return res.end();
      }
      req.session.msg = '操作成功！';
      return res.end();
    });
  });
});

module.exports = router;
