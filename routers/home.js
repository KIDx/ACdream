
var router = require('express').Router();
var Q = require('q');
var verifyCode = require('verify-code');
var redis = require('redis');

var User = require('../models/user.js');
var Contest = require('../models/contest.js');
var Topic = require('../models/topic.js');

var KEY = require('./key');
var Comm = require('../comm');
var Logic = require('../logic');
var clearSpace = Comm.clearSpace;
var ERR = Comm.ERR;
var FailRender = Comm.FailRender;
var FailProcess = Comm.FailProcess;

/*
 * 主页
 */
router.get('/', function(req, res){
  var resp = {
    title: 'ACdream Online Judge',
    key: KEY.HOME,
    getTime: Comm.getTime,
    imgType: {},
    UT: Comm.userTit,
    UC: Comm.userCol
  };

  //并发执行
  Q.all([
    //获取最近5场比赛
    Contest.topFive({type: 2, password: ""})
    .then(function(contests){
      resp.contests = contests;
    }),
    //获取最高分5位用户
    User.topTen({name: {$ne: 'admin'}})
    .then(function(users){
      resp.users = users;
    }),
    //获取话题列表以及相关用户信息
    Topic.get({cid: -1}, 1)
    .then(function(o){
      resp.topics = o.topics;
      var names = [];
      o.topics.forEach(function(p){
        names.push(p.user);
      });
      return User.find({name: {$in: names}});
    })
    .then(function(users){
      users.forEach(function(u){
        resp.imgType[u.name] = u.imgType;
      });
    })
  ])
  .then(function(){
    res.render('index', resp);
  })
  .fail(function(err){
    FailRender(err, res, ERR.SYS);
  })
  .done();
});

/*
 * 生成并返回验证码
 */
router.post('/createVerifycode', function(req, res){
  res.header('Content-Type', 'text/plain');
  var info = verifyCode.Generate();
  req.session.verifycode = info.code;
  return res.end(info.dataURL);
});

/*
 * 登录
 */
router.post('/login', function(req, res){

  var name = String(req.body.username);
  var psw = String(req.body.password);

  var ret = ERR.SYS;
  Q.fcall(function(){
    if (!name || !psw) {
      ret = ERR.ARGS;
      throw new Error('invalid args.');
    }
  })
  .then(function(){
    return User.watch(name);
  })
  .then(function(user){
    if (!user) {
      ret = ERR.NOT_EXIST;
      throw new Error('user NOT exist.');
    }
    if (user.password != Comm.MD5(psw)) {
      ret = ERR.WRONG_PASSWORD;
      throw new Error('wrong password.');
    }
    user.visTime = (new Date()).getTime();
    return Logic.SaveDoc(user);
  })
  .then(function(user){
    var Resp = function() {
      req.session.user = user;
      req.session.msg = 'Welcome, '+user.name+'. :)';
      return res.send({ret: ERR.OK});
    };
    if (String(req.body.remember) === "true") {
      var maxAge = 2592000000; //a month
      var token = Comm.MD5(String(Math.random()));
      var key = 'expire_' + Comm.MD5(user.name) + '_' + token;
      var val = String((new Date()).getTime() + maxAge);
      //save token and expire time by redis
      return Logic.SetRedis(redis.createClient(), key, val)
      .then(function(){
        //save token to cookie for fast login
        res.cookie('loginInfo', {
          username: user.name,
          token: token,
          img: user.imgType
        }, {
          httpOnly: true,
          maxAge: maxAge
        });
        return Resp();
      });
    } else {
      res.clearCookie('loginInfo');
      return Resp();
    }
  })
  .fail(function(err){
    FailProcess(err, res, ret);
  })
  .done();
});

/*
 * 通过检查Cookie中的token进行快速登录
 */
router.post('/loginByToken', function(req, res){
  var loginInfo = req.cookies.loginInfo;
  var name = loginInfo ? loginInfo.username : null;
  var token = loginInfo ? loginInfo.token : null;
  var ret = ERR.SYS;
  Q.fcall(function(){
    if (!name || !token) {
      res.clearCookie('loginInfo');
      ret = ERR.INVALID_COOKIES;
      throw new Error('invalid cookies');
    }
  })
  .then(function(){
    var key = 'expire_' + Comm.MD5(name) + '_' + token;
    //get token expire time
    return Logic.GetRedis(redis.createClient(), key);
  })
  .then(function(val){
    var expire_time = parseInt(val, 10);
    if (!expire_time || (new Date()).getTime() > expire_time) {
      res.clearCookie('loginInfo');
      ret = ERR.INVALID_COOKIES;
      throw new Error('expired cookies.');
    }
    return User.watch(name);
  })
  .then(function(user){
    if (!user) {
      ret = ERR.NOT_EXIST;
      throw new Error('user NOT exist.');
    }
    user.visTime = (new Date()).getTime();
    return Logic.SaveDoc(user);
  })
  .then(function(user){
    req.session.user = user;
    req.session.msg = 'Welcome, '+user.name+'. :)';
    return res.send({ret: ERR.OK});
  })
  .fail(function(err){
    FailProcess(err, res, ret);
  })
  .done();
});

/*
 * 退出登录
 */
router.post('/logout', function(req, res){
  res.header('Content-Type', 'text/plain');
  if (!req.session.user) {
    return res.end();
  }
  req.session.msg = 'Goodbye, '+req.session.user.name+'. Looking forward to seeing you at ACdream.';
  req.session.user = null;
  req.session.cid = null;
  return res.end();
});

module.exports = router;
