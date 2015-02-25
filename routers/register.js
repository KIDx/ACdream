
var router = require('express').Router();

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

  User.watch(name)
  .then(function(user){
    if (user) {
      return res.end('2');
    }
    return (new User({
      name: name,
      password: Comm.MD5(password),
      regTime: (new Date()).getTime(),
      nick: nick,
      school: school,
      email: email,
      signature: sig
    })).save();
  })
  .then(function(user){
    req.session.user = user;
    req.session.msg = 'Welcome, '+name+'. :)';
    return res.end();
  })
  .fail(function(err){
    LogErr(err);
    return res.end('3');
  });
});

module.exports = router;
