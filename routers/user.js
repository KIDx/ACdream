
var router = require('express').Router();

var User = require('../models/user.js');
var Solution = require('../models/solution.js');
var Problem = require('../models/problem.js');

var KEY = require('./key');
var Comm = require('../comm');
var clearSpace = Comm.clearSpace;
var LogErr = Comm.LogErr;
var ERR = Comm.ERR;
var FailRender = Comm.FailRender;

/*
 * 显示某个用户具体信息的页面
 */
router.get('/:name', function(req, res){
  var name = req.params.name;
  var ret = ERR.SYS;
  Q.fcall(function(){
    if (!name) {
      ret = ERR.PAGE_NOT_FOUND;
      throw new Error('page not found');
    }
  })
  .then(function(){
    return User.watch(name);
  })
  .then(function(user){
    if (!user) {
      ret = ERR.PAGE_NOT_FOUND;
      throw new Error('page not found');
    }
    Solution.aggregate([
      { $match: { userName: name, result: {$gt: 1} } },
      { $group: { _id: '$problemID', result: {$min: '$result'} } },
      { $sort: { _id: 1 } }
    ])
    .then(function(sols){
      var A = [], B = [];
      if (sols) {
        sols.forEach(function(p){
          if (p.result == 2) {
            A.push(p._id);
          } else {
            B.push(p._id);
          }
        });
      }
      var RP = function(H) {
        var mins = 1100;
        user.ratedRecord.forEach(function(i, p){
            if (p.rating < mins) {
              mins = p.rating;
            }
        });
        res.render('user', {
          title: 'User',
          key: KEY.USER,
          u: user,
          A: A,
          B: B,
          H: H,
          UC: Comm.userCol,
          UT: Comm.userTit,
          getTime: Comm.getAboutTime,
          minRating: mins
        });
      };
      if (user.name !== 'admin') {
        Comm.getRatingRank(user, function(err, rank){
          if (err) {
            req.session.msg = '系统错误！';
            LogErr(err);
            return res.redirect('/');
          }
          user.rank = rank;
          return RP(null);
        });
      } else {
        Problem.distinct("problemID", {hide:true})
        .then(function(pids){
          return RP(pids);
        })
        .fail(function(err){
          FailRender(err, res, ret);
        });
      }
    })
    .fail(function(err){
      FailRender(err, res, ret);
    });
  })
  .fail(function(err){
    FailRender(err, res, ret);
  });
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
  var name = clearSpace(req.body.name);
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
  res.header('Content-Type', 'text/plain');
  if (!req.session.user) {
    req.session.msg = 'Please login first!';
    return res.end();
  }
  if (req.session.user.name != req.body.name) {
    req.session.msg = 'Failed! You have no permission to do that!';
    return res.end();
  }

  var name = clearSpace(req.body.name);
  var nick = clearSpace(req.body.nick);
  var oldpsw = req.body.oldpassword;
  var psw = req.body.password;
  var school = clearSpace(req.body.school);
  var email = clearSpace(req.body.email);
  var sig = clearSpace(req.body.signature);
  if (!name || !nick || !oldpsw ||
      school.length > 50 || email.length > 50 || sig.length > 200) {
    return res.end();  //not allow
  }

  User.watch(name)
  .then(function(user){
    if (!user) {
      return res.end();  //not allow
    }
    if (Comm.MD5(String(oldpsw)) != user.password) {
      return res.end('1');
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
    User.update({name: name}, val)
    .then(function(){
      req.session.msg = 'Your Information has been updated successfully!';
      return res.end();
    })
    .fail(function(err){
      LogErr(err);
      req.session.msg = '系统错误！';
      return res.end();
    });
  })
  .fail(function(err){
    LogErr(err);
    req.session.msg = '系统错误！';
    return res.end();
  });
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
