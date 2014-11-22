
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
var FailRedirect = Comm.FailRedirect;

/*
 * 显示一个帖子的页面
 */
router.get('/', function(req, res) {
  var tid = parseInt(req.query.tid, 10);
  if (!tid) {
    return res.redirect('/404');
  }
  var Response = {
    key: KEY.TOPIC,
    getDate: getTime,
  };
  //获取一篇话题
  Topic.watch(tid)
  //处理话题
  .then(function(topic){
    if (!topic) {
      throw new Error('404');
    }
    Response.title = topic.title;
    Response.topic = topic;
    return Topic.update(tid, {$inc: {browseQty: 1}});
  })
  //获取评论
  .then(function(){
    return Comment.get({tid: tid});
  })
  //处理评论并获取用户信息
  .then(function(comments){
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
    if (!has[Response.topic.user]) {
      names.push(Response.topic.user);
    }
    Response.comments = com;
    Response.sub = sub;
    Response.N = N;
    return User.qfind({name: {$in: names}});
  })
  //处理用户信息，然后渲染页面
  .then(function(users){
    var UT = {}, UC = {}, IT = {};
    users.forEach(function(p){
      UT[p.name] = Comm.userTit(p.rating);
      UC[p.name] = Comm.userCol(p.rating);
      IT[p.name] = p.imgType;
    });
    Response.UT = UT;
    Response.UC = UC;
    Response.IT = IT;
    return res.render('topic', Response);
  })
  //失败处理
  .fail(function(err){
    FailRedirect(err, res);
  })
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

  var Response = {
    title: 'TopicList',
    key: KEY.TOPIC_LIST,
    page: page,
    search: search,
    getDate: getTime
  };

  //获取第page页话题列表信息
  Topic.get({$or:[q1, q2]}, page)
  //根据话题列表信息拿到用户列表
  .then(function(o){
    Response.topics = o.topics;
    Response.n = o.totalPage;
    var names = new Array(), has = {};
    o.topics.forEach(function(p){
      if (!has[p.user]) {
        names.push(p.user);
        has[p.user] = true;
      }
      if (p.lastReviewer && !has[p.lastReviewer]) {
        names.push(p.lastReviewer);
        has[p.lastReviewer] = true;
      }
    });
    return User.qfind({name: {$in: names}});
  })
  //遍历用户列表获取用户头像格式
  .then(function(users){
    var I = {};
    users.forEach(function(p){
      I[p.name] = p.imgType;
    });
    Response.I = I;
    return res.render('topiclist', Response);
  })
  .fail(function(err){
    FailRedirect(err, res);
  })
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

  Topic.watch(tid)
  .then(function(topic){
    if (topic) {
      topic.top = !topic.top;
      return topic.save();
    }
  })
  .then(function(){
    req.session.msg = '操作成功！';
    return res.end();
  })
  .fail(function(err){
    LogErr(err);
    res.end('3');
  });
});

module.exports = router;
