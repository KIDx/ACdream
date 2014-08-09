
var router = require('express').Router();
var crypto = require('crypto');

var User = require('../models/user.js');
var Contest = require('../models/contest.js');
var Topic = require('../models/topic.js');
var Canvas = require('../models/can.js');

var KEY = require('./key');
var Comm = require('../comm');
var clearSpace = Comm.clearSpace;
var LogErr = Comm.LogErr;

router.get('/', function(req, res){
  Topic.topFive({top: true, cid: -1}, function(err, A){
    if (err) {
      LogErr(err);
      req.session.msg = '系统错误！';
      return res.redirect('/404');
    }
    Contest.topFive({type: 2}, function(err, B){
      if (err) {
        LogErr(err);
        req.session.msg = '系统错误！';
        return res.redirect('/404');
      }
      Topic.topFive({top: false, cid: -1}, function(err, C){
        if (err) {
          LogErr(err);
          req.session.msg = '系统错误！';
          return res.redirect('/404');
        }
        User.topFive({name: {$ne: 'admin'}}, function(err, D){
          if (err) {
            LogErr(err);
            req.session.msg = '系统错误！';
            return res.redirect('/404');
          }
          res.render('index', {
            title: 'ACdream Online Judge',
            key: KEY.HOME,
            A: A,
            B: B,
            C: C,
            D: D,
            getTime: Comm.getTime,
            UT: Comm.userTit,
            UC: Comm.userCol
          });
        });
      });
    });
  });
});

router.post('/createVerifycode', function(req, res) {
  res.header('Content-Type', 'text/plain');

  Canvas.getCode(function(vcode, img){
    req.session.verifycode = vcode;
    return res.end(img);
  });
});

router.post('/login', function(req, res) {
  res.header('Content-Type', 'text/plain');

  var name = String(req.body.username);
  var psw = String(req.body.password);
  if (!name || !psw) {
    return res.end();  //not allow
  }

  var md5 = crypto.createHash('md5');
  var password = md5.update(psw).digest('base64');

  User.watch(name, function(err, user) {
    if (err) {
      LogErr(err);
      return res.end('3');
    }
    if (!user) {
      return res.end('1');
    }
    if (user.password != password) {
      return res.end('2');
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
});

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

router.post('/register', function(req, res) {
  res.header('Content-Type', 'text/plain');

  var name = clearSpace(req.body.username);
  var nick = clearSpace(req.body.nick);
  var password = req.body.password;
  var vcode = clearSpace(req.body.vcode);
  var school = clearSpace(req.body.school);
  var email = clearSpace(req.body.email);
  var sig = clearSpace(req.body.signature);

  if (!name || !nick || !password || !vcode ||
      school.length > 50 || email.length > 50 || sig.length > 200) {
    return res.end();  //not allow
  }

  if (!Comm.isUsername(name)) {
    return res.end();  //not allow
  }

  if (vcode.toLowerCase() != req.session.verifycode) {
    return res.end('1');
  }

  User.watch(name, function(err, user){
    if (err) {
      LogErr(err);
      return res.end('3');
    }
    if (user) {
      return res.end('2');
    }
    var md5 = crypto.createHash('md5');
    var psw = md5.update(password).digest('base64');
    (new User({
      name: name,
      password: psw,
      regTime: (new Date()).getTime(),
      nick: nick,
      school: school,
      email: email,
      signature: sig
    })).save(function(err, user) {
      if (err) {
        LogErr(err);
        return res.end('3');
      }
      req.session.user = user;
      req.session.msg = 'Welcome, '+name+'. :)';
      return res.end();
    });
  });
});

module.exports = router;
