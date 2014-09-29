
var router = require('express').Router();
var crypto = require('crypto');

var IDs = require('../models/ids.js');
var Solution = require('../models/solution.js');
var Problem = require('../models/problem.js');
var Contest = require('../models/contest.js');
var ContestRank = require('../models/contestrank.js');

var KEY = require('./key');
var Comm = require('../comm');
var addZero = Comm.addZero;
var clearSpace = Comm.clearSpace;
var nan = Comm.nan;
var LogErr = Comm.LogErr;

/*
 * get: addcontest页面
 * post: 增加或修改一个contest
 */
router.route('/')
.get(function(req, res){
  var type = parseInt(req.query.type, 10);
  if (!type || type < 1 || type > 2) {
    return res.redirect('/404');
  }
  if (!req.session.user) {
    req.session.msg = 'Please login first!';
    return res.redirect('/contest/list?type='+type);
  }
  var RP = function(C, clone, type, E, P) {
    res.render('addcontest', {
      title: 'AddContest',
      contest: C,
      getDate: Comm.getDate,
      key: KEY.ADD_CONTEST,
      clone: clone,
      type: type,
      family: String(req.query.family),
      edit: E,
      P: P
    });
  };
  var name = req.session.user.name;
  var cid = parseInt(req.query.cID, 10);
  /*
   * !cid: add a new contest
   * cid < 0: clone a contest (clone to DIY Contest)
   * cid > 0: edit a contest
   */
  if (!cid) {
    if (type == 2 && name != 'admin') {
      req.session.msg = 'You have no permission to add VIP Contest!';
      return res.redirect('/contest/list?type=2');
    }
    return RP(null, 0, type, true, {});
  } else {
    var clone = 0;
    if (cid < 0) {
      clone = 1;
      cid = -cid;
    }
    Contest.watch(cid, function(err, contest){
      if (err) {
        LogErr(err);
        req.session.msg = '系统错误！';
        return res.redirect('/');
      }
      if (!contest) {
        return res.redirect('/404');
      }
      if (clone == 0 && name != contest.userName && name != 'admin') {
        req.session.msg = 'You are not the manager of this contest!';
        return res.redirect('/contest?cid='+cid);
      }
      if (clone == 1 && name != contest.userName && name != 'admin') {
        if ((new Date()).getTime() - contest.startTime < contest.len*60000) {
          return res.end();  //not allow
        }
      }
      var TP = function(E) {
        var pids = new Array();
        if (contest.probs) {
          contest.probs.forEach(function(p){
            pids.push(p[0]);
          });
        }
        Problem.find({problemID: {$in: pids}}, function(err, problems){
          if (err) {
            LogErr(err);
            req.session.msg = '系统错误！';
            return res.redirect('/');
          }
          var P = {};
          if (problems) {
            problems.forEach(function(p){
              P[p.problemID] = p;
            });
          }
          return RP(contest, clone, null, E, P);
        });
      };
      if (clone == 1) {
        TP(true);
      } else {
        Solution.watch({cID: cid}, function(err, sol){
          if (err) {
            LogErr(err);
            req.session.msg = '系统错误！';
            return res.redirect('/');
          }
          var E = sol ? false : true;
          return TP(E);
        });
      }
    });
  }
})
.post(function(req, res){
  res.header('Content-Type', 'text/plain');

  var psw = '';
  var title = clearSpace(req.body.title);
  var date = clearSpace(req.body.date);
  var hour = addZero(req.body.hour);
  var min = addZero(req.body.min);
  var dd = parseInt(req.body.dd, 10);
  var hh = parseInt(req.body.hh, 10);
  var mm = parseInt(req.body.mm, 10);
  var penalty = parseInt(req.body.penalty, 10);
  var desc = clearSpace(req.body.desc);
  var anc = clearSpace(req.body.anc);
  var type = parseInt(req.body.type, 10);
  var family = clearSpace(req.body.family);

  if (!title || !date || !hour || !min ||
      nan(dd) || nan(hh) || nan(mm) || !penalty ||
      !type || type < 1 || type > 2) {
    return res.end();  //not allow!
  }

  if (!req.session.user) {
    req.session.msg = 'Failed! Please login first!';
    return res.end();
  }
  var name = req.session.user.name;
  if (type == 2 && name != 'admin') {
    req.session.msg = 'Failed! You have no permission to add VIP Contest!';
    return res.end();
  }

  if (type == 2) {
    psw = req.body.psw ? '1' : '';
  } else if (req.body.psw) {
    var md5 = crypto.createHash('md5');
    psw = md5.update(req.body.psw).digest('base64');
  }

  var pids = new Array();
  if (req.body.pids && req.body.pids.length) {
    req.body.pids.forEach(function(p){
      pids.push(p);
    });
  }
  var open_reg = String(req.body.open_reg) === 'true' ? true : false;
  var alias = req.body.alias ? req.body.alias : {};
  var RP = function(ary) {
    var startTime = (new Date(date+' '+hour+':'+min)).getTime();
    var len = dd*1440 + hh*60 + mm;
    var cid = parseInt(req.body.cid, 10);
    if (cid) {
      Contest.watch(cid, function(err, con) {
        if (err) {
          LogErr(err);
          req.session.msg = '系统错误！';
          return res.end();
        }
        if (!con || con.type != type) {
          return res.end();  //not allow
        }
        if (name != con.userName && name != 'admin') {
          req.session.msg = 'Update Failed! You are not the manager!';
          return res.end();
        }
        con.title = title;
        var flg = false;
        if (con.startTime != startTime || con.len > len || con.penalty != penalty) {
          flg = true;
          con.updateTime = con.maxRunID = 0;
        }
        con.startTime = startTime;
        con.len = len;
        con.penalty = penalty;
        con.description = desc;
        con.msg = anc;
        con.open_reg = open_reg;
        con.family = family;
        if (con.password != req.body.psw)
          con.password = psw;
        var save = function() {
          con.save(function(err){
            if (err) {
              LogErr(err);
              req.session.msg = '系统错误！';
              return res.end();
            }
            req.session.msg = 'Your Contest has been updated successfully!';
            var tp = cid.toString();
            if (!flg) {
              return res.end(tp);
            }
            ContestRank.clear({'_id.cid':cid}, function(err){
              if (err) {
                LogErr(err);
                req.session.msg = '系统错误！';
                return res.end();
              }
              return res.end(tp);
            });
          });
        }, judge = function() {
          if (ary.length != con.probs.length) {
            return false;
          }
          for (var i = 0; i < ary.length; i++) {
            if (ary[i][0] != con.probs[i][0])
              return false;
          }
          return true;
        };
        if (judge()) {
          con.probs = ary;
          return save();
        }
        Solution.watch({cID: cid}, function(err, sol){
          if (err) {
            LogErr(err);
            req.session.msg = '系统错误！';
            return res.end();
          }
          if (!sol)
            con.probs = ary;
          return save();
        });
      });
    } else {
      if (!ary.length) {
        return res.end();  //not allow
      }
      IDs.get('contestID', function(err, id) {
        if (err) {
          LogErr(err);
          req.session.msg = '系统错误！';
          return res.end();
        }
        (new Contest({
          contestID: id,
          userName: name,
          title: title,
          startTime: startTime,
          len: len,
          penalty: penalty,
          description: desc,
          msg: anc,
          probs: ary,
          password: psw,
          open_reg: open_reg,
          type: type,
          family: family
        })).save(function(err) {
          if (err) {
            LogErr(err);
            req.session.msg = '系统错误！';
            return res.end();
          }
          req.session.msg = 'Your Contest has been added successfully!';
          return res.end(id.toString());
        });
      });
    }
  };
  Problem.find({problemID: {$in: pids}}, function(err, problems){
    if (err) {
      LogErr(err);
      req.session.msg = '系统错误！';
      return res.end();
    }
    var has = {};
    if (problems) {
      problems.forEach(function(p){
        has[p.problemID] = true;
      });
    }
    var ary = new Array();
    pids.forEach(function(p, i){
      if (has[p])
        ary.push([p, clearSpace(alias[i])]);
    });
    return RP(ary);
  });
});

module.exports = router;
