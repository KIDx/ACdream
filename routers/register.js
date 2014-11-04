
var router = require('express').Router();
var crypto = require('crypto');

var KEY = require('./key');
var User = require('../models/user.js');

//var Settings = require('../settings');
var Comm = require('../comm');
var LogErr = Comm.LogErr;
var clearSpace = Comm.clearSpace;

/*
 * get: 注册页面
 * post: 提交注册
 */
router.route('/')
.get(function(req, res){
  if(req.session.user) {
    req.session.msg = 'Already login!';
    return res.redirect('/');
  }
  return res.render('register', {
    title: 'Register',
    key: KEY.REGISTER
  });
})
.post(function(req, res){
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
