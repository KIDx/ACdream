
var router = require('express').Router();
var Q = require('q');

var User = require('../models/user.js');
var Solution = require('../models/solution.js');
var Problem = require('../models/problem.js');

var KEY = require('./key');
var Comm = require('../comm');
var Logic = require('../logic');
var LogErr = Comm.LogErr;
var ERR = Comm.ERR;
var FailRender = Comm.FailRender;
var FailProcess = Comm.FailProcess;

/*
 * 显示某个用户具体信息的页面
 */
router.get('/:name', function(req, res){
  var name = req.params.name;
  var resp = {
    title: 'User',
    key: KEY.USER,
    UC: Comm.userCol,
    UT: Comm.userTit,
    getTime: Comm.getAboutTime,
  };
  var ret = ERR.SYS;
  Q.fcall(function(){
    if (!name) {
      ret = ERR.PAGE_NOT_FOUND;
      throw new Error('page not found');
    }
    return User.watch(name);
  })
  .then(function(user){
    if (!user) {
      ret = ERR.PAGE_NOT_FOUND;
      throw new Error('page not found');
    }
    resp.u = user;
    resp.minRating = 1100;
    user.ratedRecord.forEach(function(i, p){
      if (p.rating < resp.minRating) {
        resp.minRating = p.rating;
      }
    });
    return [
      Solution.aggregate([
        { $match: { userName: name, result: {$gt: 1} } },
        { $group: { _id: '$problemID', result: {$min: '$result'} } },
        { $sort: { _id: 1 } }
      ]),
      Logic.GetRatingBeforeCount(user),
      name === 'admin' ? Problem.distinct("problemID", {hide:true}) : null
    ];
  })
  .spread(function(sols, cnt, pids){
    resp.A = [];
    resp.B = [];
    sols.forEach(function(p){
      if (p.result === 2) {
        resp.A.push(p._id);
      } else {
        resp.B.push(p._id);
      }
    });
    resp.u.rank = cnt + 1;
    resp.H = pids;
    res.render('user', resp);
  })
  .fail(function(err){
    FailRender(err, res, ret);
  })
  .done();
});

/*
 * 赋予或回收某个用户的加题权限
 */
router.post('/changeAddprob', function(req, res) {
  res.header('Content-Type', 'text/plain');
  if (!req.session.user) {
    req.session.msg = 'Please login first!';
    return res.end();
  }
  if (req.session.user.name != 'admin') {
    req.session.msg = 'You have no permission to do that!';
    return res.end();
  }
  var name = Comm.clearSpace(req.body.name);
  if (!name) {
    return res.end();  //not allow
  }
  User.watch(name)
  .then(function(user){
    if (!user) {
      return ;
    }
    return User.update({name: name}, {$set: {addprob: !user.addprob}});
  })
  .then(function(){
    req.session.msg = '操作成功！';
    return res.end();
  })
  .fail(function(err){
    LogErr(err);
    req.session.msg = '系统错误！';
    return res.end();
  });
});

/*
 * 用户修改自己的基本信息
 */
router.post('/changeInfo', function(req, res) {
  var name = req.body.name;
  var nick = Comm.clearSpace(req.body.nick);
  var oldpsw = req.body.oldpassword;
  var psw = req.body.password;
  var school = Comm.clearSpace(req.body.school);
  var email = Comm.clearSpace(req.body.email);
  var sig = Comm.clearSpace(req.body.signature);
  var ret = ERR.SYS;
  Q.fcall(function(){
    if (!req.session.user) {
      ret = ERR.INVALID_SESSION;
      throw new Error('invalid session.');
    }
    if (!name || !nick || !oldpsw || school.length > 50 || email.length > 50 || sig.length > 200) {
      ret = ERR.ARGS;
      throw new Error('invalid args.');
    }
    if (req.session.user.name !== name) {
      ret = ERR.ACCESS_DENIED;
      throw new Error('access denied.');
    }
    return User.watch(name)
  })
  .then(function(user){
    if (!user) {
      ret = ERR.NOT_EXIST;
      throw new Error('user NOT exist.');
    }
    if (Comm.MD5(String(oldpsw)) !== user.password) {
      ret = ERR.WRONG_PASSWORD;
      throw new Error('wrong password.');
    }
    var val = {
      nick: nick,
      school: school,
      email: email,
      signature: sig
    };
    if (psw) {
      val.password = Comm.MD5(String(psw));
    }
    return User.update({name: name}, val);
  })
  .then(function(){
    req.session.msg = 'Your Information has been updated successfully.';
    return res.send({ret: ERR.OK});
  })
  .fail(function(err){
    FailProcess(err, res, ret);
  })
  .done();
});

/*
 * 将某个用户的密码重置为123456
 */
router.post('/restorePsw', function(req, res) {
  res.header('Content-Type', 'text/plain');
  if (!req.session.user) {
    req.session.msg = 'Please login first!';
    return res.end();
  }
  if (req.session.user.name != 'admin') {
    req.session.msg = 'Failed! You have no permission to do that!';
    return res.end();
  }
  var name = String(req.body.name);
  if (!name) {
    return res.end();  //not allow
  }
  User.update({name: name}, {$set: {password: Comm.MD5('123456')}})
  .then(function(){
    req.session.msg = '已成功将'+name+'的密码恢复为"123456"！';
    return res.end();
  })
  .fail(function(err){
    LogErr(err);
    req.session.msg = '系统错误！';
    return res.end();
  });
});

module.exports = router;
