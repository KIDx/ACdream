
var router = require('express').Router();
var xss = require('xss');
var Q = require('q');

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

//获取评论，子评论，以及相关用户信息
function GetComment(cond, author, currentUser) {
  var d = Q.defer();
  var o = {};
  var has = {};
  var names = [];
  if (author) {
    names.push(author);
    has[author] = true;
  }
  if (currentUser && !has[currentUser]) {
    names.push(currentUser);
    has[currentUser] = true;
  }
  Comment.get(cond)
  .then(function(docs){
    var ids = [];
    var comments = [];
    docs.forEach(function(p){
      ids.push(p.id);
      if (!has[p.user]) {
        names.push(p.user);
        has[p.user] = true;
      }
      comments.push({
        id: p.id,
        content: p.content,
        user: p.user,
        at: p.at,
        fa: p.fa,
        inDate: getTime(p.inDate)
      });
    });
    var minID = 0;
    o.comments = comments;
    if (comments.length) {
      minID = comments[comments.length - 1].id;
    }
    cond.id = {$lt: minID};
    return [Comment.find({fa: {$in: ids}}), Comment.findOne(cond)]
  })
  .spread(function(docs, comment){
    o.haveMore = comment ? true : false;
    o.sub = {};
    docs.forEach(function(p){
      if (!o.sub[p.fa]) {
        o.sub[p.fa] = [];
      }
      o.sub[p.fa].push({
        id: p.id,
        content: p.content,
        user: p.user,
        at: p.at,
        fa: p.fa,
        inDate: getTime(p.inDate)
      });
      if (!has[p.user]) {
        names.push(p.user);
        has[p.user] = true;
      }
    });
    return User.qfind({name: {$in: names}});
  })
  .then(function(users){
    o.UT = {};
    o.UC = {};
    o.IT = {};
    users.forEach(function(p){
      o.UT[p.name] = Comm.userTit(p.rating);
      o.UC[p.name] = Comm.userCol(p.rating);
      o.IT[p.name] = p.imgType;
    });
    return d.resolve(o);
  })
  .fail(function(err){
    d.reject(err);
  });
  return d.promise;
}

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
  };
  //获取一篇话题
  Topic.watch(tid)
  //处理话题
  .then(function(doc){
    if (!doc) {
      throw new Error('404');
    }
    Response.title = doc.title;
    Response.topic = {
      id: doc.id,
      title: doc.title,
      content: doc.content,
      user: doc.user,
      cid: doc.cid,
      top: doc.top,
      inDate: getTime(doc.inDate)
    };
    return Topic.update(tid, {$inc: {browseQty: 1}});
  })
  .then(function(){
    return GetComment({tid: tid, fa: -1}, Response.topic.user, req.session.user ? req.session.user.name : null);
  })
  .then(function(o){
    Response.comments = o.comments;
    Response.sub = o.sub;
    Response.UT = o.UT;
    Response.UC = o.UC;
    Response.IT = o.IT;
    Response.haveMore = o.haveMore;
    return res.render('topic', Response);
  })
  //失败处理
  .fail(function(err){
    FailRedirect(err, req, res);
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
    FailRedirect(err, req, res);
  })
});

/*
 * 切换置顶状态
 */
router.post('/toggleTop', function(req, res){
  res.header('Content-Type', 'text/plain');
  if (!req.session.user || req.session.user.name !== 'admin') {
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

/*
 * 获取更多评论
 */
router.post('/getComments', function(req, res){
  var tid = parseInt(req.body.tid, 10);
  var minID = parseInt(req.body.min_id, 10);
  if (!tid || !minID) {
    return res.end(); //not allow
  }

  GetComment({tid: tid, id: {$lt: minID}})
  .then(function(o){
    return res.send(o);
  })
  .fail(function(err){
    LogErr(err);
    res.end('3');
  });

});

module.exports = router;
