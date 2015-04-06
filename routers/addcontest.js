
var router = require('express').Router();
var Q = require('q');

var IDs = require('../models/ids.js');
var Solution = require('../models/solution.js');
var Problem = require('../models/problem.js');
var Contest = require('../models/contest.js');
var ContestRank = require('../models/contestrank.js');

var KEY = require('./key');
var Comm = require('../comm');
var Logic = require('../logic');
var addZero = Comm.addZero;
var clearSpace = Comm.clearSpace;
var nan = Comm.nan;
var LogErr = Comm.LogErr;
var ERR = Comm.ERR;
var FailRender = Comm.FailRender;
var FailProcess = Comm.FailProcess;

/*
 * get: addcontest页面
 * post: 增加或修改一个contest
 */
router.route('/')
.get(function(req, res){
  /*
   * !cid: add a new contest
   * cid < 0: clone a contest (clone to DIY Contest)
   * cid > 0: edit a contest
   */
  var cid = parseInt(req.query.cID, 10);
  var type = parseInt(req.query.type, 10);
  var name;
  var resp = {
    title: 'AddContest',
    contest: null,
    getDate: Comm.getDate,
    key: KEY.ADD_CONTEST,
    clone: 0,
    type: type,
    family: String(req.query.family),
    edit: true,
    P: {}
  };
  var clone = 0;
  var ret = ERR.SYS;
  Q.fcall(function(){
    if (!type || type < 1 || type > 2) {
      ret = ERR.PAGE_NOT_FOUND;
      throw new Error('page not found');
    }
    if (!req.session.user) {
      ret = ERR.INVALID_SESSION;
      throw new Error('invalid session');
    }
    name = req.session.user.name;
    if (!cid && type == 2 && name != 'admin') {
      ret = ERR.ACCESS_DENIED;
      throw new Error('access denied');
    }
    if (cid) {
      if (cid < 0) {
        clone = 1;
        cid = -cid;
      }
      return Contest.watch(cid)
      .then(function(contest){
        if (!contest) {
          ret = ERR.PAGE_NOT_FOUND;
          throw new Error('page not found');
        }
        if (clone == 0 && name != contest.userName && name != 'admin' ||
            clone == 1 && name != contest.userName && name != 'admin' && !Comm.isEnded(contest)) {
          ret = ERR.ACCESS_DENIED;
          throw new Error('access denied');
        }
        resp.contest = contest;
        var pids = [];
        if (contest.probs) {
          contest.probs.forEach(function(p){
            pids.push(p[0]);
          });
        }
        return Problem.find({problemID: {$in: pids}});
      }).then(function(problems){
        var P = {};
        if (problems) {
          problems.forEach(function(p){
            P[p.problemID] = p;
          });
        }
        resp.P = P;
        if (clone == 1) {
          resp.edit = true;
        } else {
          return Solution.findOne({cID: cid})
          .then(function(sol){
            resp.edit = sol ? false : true;
          });
        }
      });
    }
  })
  .then(function(){
    res.render('addcontest', resp);
  })
  .fail(function(err){
    FailRender(err, res, ret);
  })
  .done();
})
.post(function(req, res){
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
  var open_reg = req.body.open_reg === 'true' ? true : false;
  var alias = req.body.alias ? req.body.alias : {};
  var cid = parseInt(req.body.cid, 10);
  var pids = [];
  if (req.body.pids && req.body.pids instanceof Array) {
    req.body.pids.forEach(function(p){
      var pid = parseInt(p);
      if (pid) {
        pids.push(p);
      }
    });
  }
  if (type == 2) {
    psw = req.body.psw ? '1' : '';
  } else if (req.body.psw) {
    psw = Comm.MD5(String(req.body.psw));
  }

  var name = '';
  var probList = [];
  var resp = {ret: ERR.OK};
  var ret = ERR.SYS;
  Q.fcall(function(){
    if (!title || !date || !hour || !min ||
        nan(dd) || nan(hh) || nan(mm) || !penalty ||
        !type || type < 1 || type > 2) {
      ret = ERR.ARGS;
      throw new Error('invalid args');
    }
    if (!req.session.user) {
      ret = ERR.INVALID_SESSION;
      throw new Error('invalid session');
    }
    name = req.session.user.name;
    if (type === 2 && name !== 'admin') {
      ret = ERR.ACCESS_DENIED;
      throw new Error('access denied');
    }
    return Problem.find({problemID: {$in: pids}});
  })
  .then(function(problems){
    problems.forEach(function(p){
      if (!p.hide || name === p.manager || name === 'admin') {
        probList.push([p.problemID, clearSpace(alias[p.problemID])]);
      }
    });
    if (probList.length === 0) {
      ret = ERR.ARGS;
      throw new Error('empty probList.');
    }
    var startTime = (new Date(date+' '+hour+':'+min)).getTime();
    var len = dd*1440 + hh*60 + mm;
    if (!cid) {
      return IDs.get('contestID')
      .then(function(id){
        resp.id = id;
        return (new Contest({
          contestID: id,
          userName: name,
          title: title,
          startTime: startTime,
          len: len,
          penalty: penalty,
          description: desc,
          msg: anc,
          probs: probList,
          password: psw,
          open_reg: open_reg,
          type: type,
          family: family
        })).save();
      });
    } else {
      var bNeedClear = false;
      var contest;
      return Contest.watch(cid)
      .then(function(con){
        if (!con || type != con.type) {
          ret = ERR.ARGS;
          throw new Error('invalid args.');
        }
        if (name != con.userName && name != 'admin') {
          ret = ERR.ACCESS_DENIED;
          throw new Error('access denied');
        }
        con.title = title;
        if (con.startTime !== startTime || con.len > len || con.penalty !== penalty) {
          bNeedClear = true;
          con.updateTime = con.maxRunID = 0;
        }
        con.startTime = startTime;
        con.len = len;
        con.penalty = penalty;
        con.description = desc;
        con.msg = anc;
        con.open_reg = open_reg;
        con.family = family;
        if (con.password != psw) {
          con.password = psw;
        }
        resp.id = cid;
        contest = con;
        return Solution.findOne({cID: cid});
      })
      .then(function(sol){
        if (!sol) {
          contest.probs = probList;
        }
        return Logic.SaveDoc(contest);
      })
      .then(function(){
        if (bNeedClear) {
          return Logic.ClearReduceData([cid]);
        }
      });
    }
  })
  .then(function(err){
    if (cid) {
      req.session.msg = 'Your Contest has been updated successfully!';
    } else {
      req.session.msg = 'Your Contest has been added successfully!';
    }
    res.send(resp);
  })
  .fail(function(err){
    FailProcess(err, res, ret);
  })
  .done();
});

module.exports = router;
