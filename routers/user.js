
var router = require('express').Router();
var crypto = require('crypto');

var User = require('../models/user.js');
var Solution = require('../models/solution.js');
var Problem = require('../models/problem.js');

var KEY = require('./key');
var Comm = require('../comm');
var clearSpace = Comm.clearSpace;
var LogErr = Comm.LogErr;

/*
 * 显示某个用户具体信息的页面
 */
router.get('/:name', function(req, res){
  var name = req.params.name;
  if (!name) {
    return res.redirect('/404');
  }
  User.watch(name, function(err, user){
    if (err) {
      LogErr(err);
      req.session.msg = '系统错误！';
      return res.redirect('/');
    }
    if (!user) {
      return res.redirect('/404');
    }
    Solution.aggregate([
    { $match: { userName: name, result:{$gt:1} } }
  , { $group: { _id: '$problemID', result: {$min: '$result'} } }
  , { $sort: { _id: 1 } }
    ], function(err, sols){
      if (err) {
        LogErr(err);
        req.session.msg = '系统错误！';
        return res.redirect('/');
      }
      var A = new Array(), B = new Array();
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
        Problem.distinct("problemID", {hide:true}, function(err, pids){
          if (err) {
            req.session.msg = '系统错误！';
            LogErr(err);
            return res.redirect('/');
          }
          return RP(pids);
        });
      }
    });
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
  User.watch(name, function(err, user){
    if (err) {
      LogErr(err);
      req.session.msg = '系统错误！';
      return res.end();
    }
    user.addprob = !user.addprob;
    user.save(function(err){
      if (err) {
        LogErr(err);
        req.session.msg = '系统错误！';
        return res.end();
      }
      if (user.addprob) {
        req.session.msg = '赋予加题权限成功！';
      } else {
        req.session.msg = '回收加题权限成功！';
      }
      return res.end();
    });
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

  var md5 = crypto.createHash('md5');
  var oldpassword = md5.update(oldpsw).digest('base64');

  User.watch(name, function(err, user){
    if (err) {
      LogErr(err);
      req.session.msg = '系统错误！';
      return res.end();
    }
    if (!user) {
      return res.end();  //not allow
    }
    if (oldpassword != user.password) {
      return res.end('1');
    }
    var H = {
      nick    : nick,
      school  : school,
      email  : email,
      signature : sig
    };
    if (psw) {
      var Md5 = crypto.createHash('md5');
      H.password = Md5.update(psw).digest('base64');
    }
    User.update({name: name}, H, function(err){
      if (err) {
        LogErr(err);
        req.session.msg = '系统错误！';
        return res.end();
      }
      req.session.msg = 'Your Information has been updated successfully!';
      return res.end();
    });
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
  User.update({name: name}, {$set: {password: crypto.createHash('md5').update('123456').digest('base64')}}, function(err){
    if (err) {
      LogErr(err);
      req.session.msg = '系统错误！';
      return res.end();
    }
    req.session.msg = '已成功将'+name+'的密码恢复为"123456"！';
    return res.end();
  });
});

module.exports = router;
