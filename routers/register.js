
var router = require('express').Router();
var Q = require('q');

var KEY = require('./key');
var User = require('../models/user.js');

var Comm = require('../comm');
var ERR = Comm.ERR;
var FailProcess = Comm.FailProcess;

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
  var name = Comm.clearSpace(req.body.username);
  var nick = Comm.clearSpace(req.body.nick);
  var password = req.body.password;
  var vcode = Comm.clearSpace(req.body.vcode);
  var school = Comm.clearSpace(req.body.school);
  var email = Comm.clearSpace(req.body.email);
  var sig = Comm.clearSpace(req.body.signature);
  var ret = ERR.SYS;
  Q.fcall(function(){
    if (!name || !nick || !Comm.isString(password) || !password || !vcode || school.length > 50 ||
        email.length > 50 || sig.length > 200 || !Comm.isUsername(name)) {
      ret = ERR.ARGS;
      throw new Error('invalid args.');
    }
    if (vcode.toLowerCase() !== req.session.verifycode) {
      ret = ERR.ARGS;
      throw new Error('wrong verify code.');
    }
    return User.watch(name);
  })
  .then(function(user){
    if (user) {
      ret = ERR.ARGS;
      throw new Error('the user name has already been registered.');
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
    res.send({ret: ERR.OK});
  })
  .fail(function(err){
    FailProcess(err, res, ret);
  })
  .done();
});

module.exports = router;
