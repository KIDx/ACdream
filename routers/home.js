
var router = require('express').Router();
var async = require('async');
var Q = require('q');
var verifyCode = require('verify-code');
var redis = require('redis');

var User = require('../models/user.js');
var Contest = require('../models/contest.js');
var Topic = require('../models/topic.js');

var KEY = require('./key');
var Comm = require('../comm');
var clearSpace = Comm.clearSpace;
var LogErr = Comm.LogErr;

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
    Contest.topFive({type: 2})
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
    LogErr(err);
    res.redirect('/404');
  });
});

/*
 * 生成并返回验证码
 */
router.post('/createVerifycode', function(req, res) {
  res.header('Content-Type', 'text/plain');
  var info = verifyCode.Generate();
  req.session.verifycode = info.code;
  return res.end(info.dataURL);
});

/*
 * 登录
 */
router.post('/login', function(req, res) {
  res.header('Content-Type', 'text/plain');

  var name = String(req.body.username);
  var psw = String(req.body.password);
  if (!name || !psw) {
    return res.end();  //not allow
  }

  User.watch(name)
  .then(function(user){
    if (!user) {
      return res.end('1');
    }
    if (user.password != Comm.MD5(psw)) {
      return res.end('2');
    }
    user.visTime = (new Date()).getTime();
    user.save(function(err){
      if (err) {
        LogErr(err);
        return res.end('3');
      }
      var Resp = function() {
        req.session.user = user;
        req.session.msg = 'Welcome, '+user.name+'. :)';
        return res.end();
      };
      if (String(req.body.remember) === "true") {
        var maxAge = 2592000000; //a month
        var token = Comm.MD5(String(Math.random()));

        var client = redis.createClient();
        var key = 'expire_' + Comm.MD5(user.name) + '_' + token;
        var val = String((new Date()).getTime() + maxAge);
        //save token and expire time by redis
        client.set(key, val, function(err){
          client.quit();
          if (err) {
            return Resp(); //ignore
          }
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
    });
  })
  .fail(function(err){
    LogErr(err);
    return res.end('3');
  });
});

/*
 * 通过检查Cookie中的token进行快速登录
 */
router.post('/loginByToken', function(req, res) {
  res.header('Content-Type', 'text/plain');

  var loginInfo = req.cookies.loginInfo;
  if (!loginInfo ) {
    return res.end('1');
  }
  var name = loginInfo.username;
  var token = loginInfo.token;
  if (!name || !token) {
    res.clearCookie('loginInfo');
    return res.end('1');
  }

  User.watch(name)
  .then(function(user){
    var client = redis.createClient();
    var key = 'expire_' + Comm.MD5(user.name) + '_' + token;
    //get token expire time
    client.get(key, function(err, val){
      client.quit();
      if (err) {
        LogErr(err);
        return res.end('3');
      }
      var expire_time = parseInt(val, 10);
      if (!expire_time || (new Date()).getTime() > expire_time) {
        res.clearCookie('loginInfo');
        return res.end('1');
      }
      user.visTime = (new Date()).getTime();
      user.save(function(err){
        if (err) {
          LogErr(err);
          return res.end('3');
        }
        req.session.user = user;
        req.session.msg = 'Welcome, '+user.name+'. :)';
        return res.end();
      });
    });
  })
  .fail(function(err){
    LogErr(err);
    return res.end('3');
  });
});

/*
 * 退出登录
 */
router.post('/logout', function(req, res) {
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
