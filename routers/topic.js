
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
var ERR = Comm.ERR;
var FailRender = Comm.FailRender;
var FailProcess = Comm.FailProcess;

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
    return User.find({name: {$in: names}});
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
  })
  .done();
  return d.promise;
}

/*
 * 显示一个帖子的页面
 */
router.get('/', function(req, res) {
  var tid = parseInt(req.query.tid, 10);
  var resp = {
    key: KEY.TOPIC,
  };
  var ret = ERR.SYS;
  Q.fcall(function(){
    if (!tid) {
      ret = ERR.PAGE_NOT_FOUND;
      throw new Error('page not found.');
    }
  })
  .then(function(){
    return Topic.watch(tid)
  })
  .then(function(topic){
    if (!topic) {
      ret = ERR.PAGE_NOT_FOUND;
      throw new Error('page not found.');
    }
    resp.title = topic.title;
    resp.topic = {
      id: topic.id,
      title: topic.title,
      content: topic.content,
      user: topic.user,
      cid: topic.cid,
      top: topic.top,
      inDate: getTime(topic.inDate)
    };
    return [
      GetComment({tid: tid, fa: -1}, topic.user, req.session.user ? req.session.user.name : null),
      Topic.update(tid, {$inc: {browseQty: 1}})
    ];
  })
  .spread(function(o){
    resp.comments = o.comments;
    resp.sub = o.sub;
    resp.UT = o.UT;
    resp.UC = o.UC;
    resp.IT = o.IT;
    resp.haveMore = o.haveMore;
    res.render('topic', resp);
  })
  .fail(function(err){
    FailRender(err, res, ret);
  })
  .done();
});

/*
 * 显示帖子列表的页面
 */
router.get('/list', function(req, res){
  var page = parseInt(req.query.page, 10);
  if (!page) {
    page = 1;
  }
  var search = req.query.search;
  var resp = {
    title: 'TopicList',
    key: KEY.TOPIC_LIST,
    page: page,
    search: search,
    getDate: getTime
  };
  var ret = ERR.SYS;
  Q.fcall(function(){
    if (page < 0) {
      ret = ERR.REDIRECT;
      throw new Error('redirect.');
    }
    var cond1 = {cid: -1}, cond2 = {cid: -1};
    if (search) {
      cond1.title = cond2.user = new RegExp("^.*"+Comm.toEscape(search)+".*$", 'i');
    }
    return Topic.get({$or: [cond1, cond2]}, page);
  })
  .then(function(o){
    resp.topics = o.topics;
    resp.totalPage = o.totalPage;
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
    return User.find({name: {$in: names}});
  })
  //遍历用户列表获取用户头像格式
  .then(function(users){
    var I = {};
    users.forEach(function(p){
      I[p.name] = p.imgType;
    });
    resp.I = I;
    res.render('topiclist', resp);
  })
  .fail(function(err){
    if (ret === ERR.REDIRECT) {
      return res.redirect('/topic/list');
    }
    FailRender(err, res, ret);
  })
  .done();
});

/*
 * 切换置顶状态
 */
router.post('/toggleTop', function(req, res){
  var tid = parseInt(req.body.tid, 10);
  var ret = ERR.SYS;
  Q.fcall(function(){
    if (!req.session.user || req.session.user.name !== 'admin') {
      ret = ERR.ACCESS_DENIED;
      throw new Error('access denied.');
    }
    if (!tid) {
      ret = ERR.ARGS;
      throw new Error('invalid args.');
    }
    return Topic.watch(tid);
  })
  .then(function(topic){
    if (!topic) {
      ret = ERR.NOT_EXIST;
      throw new Error('topic not exist.');
    }
    topic.top = !topic.top;
    return topic.save();
  })
  .then(function(){
    req.session.msg = 'toggle success.';
    return res.send({ret: ERR.OK});
  })
  .fail(function(err){
    FailProcess(err, res, ret);
  })
  .done();
});

/*
 * 获取更多评论
 */
router.post('/getComments', function(req, res){
  var tid = parseInt(req.body.tid, 10);
  var minID = parseInt(req.body.min_id, 10);
  var ret = ERR.SYS;
  Q.fcall(function(){
    if (!tid || !minID) {
      ret = ERR.ARGS;
      throw new Error('invalid args.');
    }
    return GetComment({tid: tid, id: {$lt: minID}});
  })
  .then(function(o){
    return res.send({ret: 0, data: o});
  })
  .fail(function(err){
    FailProcess(err, res, ret);
  })
  .done();

});

module.exports = router;
