
var router = require('express').Router();
var Q = require('q');

var User = require('../models/user.js');
var Solution = require('../models/solution.js');
var Problem = require('../models/problem.js');
var Contest = require('../models/contest.js');

var Settings = require('../settings');
var KEY = require('./key');
var Comm = require('../comm');
var ERR = Comm.ERR;
var FailRender = Comm.FailRender;
var FailProcess = Comm.FailProcess;

/*
 * Status页面
 */
router.get('/', function(req, res){
  var page = parseInt(req.query.page, 10);
  if (!page) {
    page = 1;
  }
  var name = Comm.clearSpace(req.query.name);
  var pid = parseInt(req.query.pid, 10);
  var result = parseInt(req.query.result, 10);
  var lang = parseInt(req.query.lang, 10);
  var resp = {
    title: 'Status',
    key: KEY.STATUS,
    getDate: Comm.getDate,
    name: name,
    pid: pid,
    result: result,
    lang: lang,
    Res: Comm.solRes,
    Col: Comm.solCol,
    page: page,
    langs: Settings.languages
  };
  var ret = ERR.SYS;
  Q.fcall(function(){
    if (page < 0 || result < 0 || result > 15 || lang < 0 || lang >= Settings.languages.length) {
      ret = ERR.REDIRECT;
      throw new Error('redirect.');
    }
    var cond = {};
    if (name) {
      cond.userName = Comm.toEscape(name);
    }
    if (pid) {
      cond.problemID = pid;
    }
    if (result >= 0) {
      if (result == 9) {
        cond.result = { $in : [9, 10, 11, 12, 15] };
      } else {
        cond.result = result;
      }
    }
    if (lang) {
      cond.language = lang;
    }
    return Solution.get(cond, page);
  })
  .then(function(o) {
    var has = {};
    var R = [], C = [];
    var names = [], pids = [];
    if (o.solutions) {
      o.solutions.forEach(function(p, i){
        R.push(Comm.solRes(p.result));
        C.push(Comm.solCol(p.result));
        if (!has[p.userName]) {
          has[p.userName] = true;
          names.push(p.userName);
        }
        if (!has[p.problemID]) {
          has[p.problemID] = true;
          pids.push(p.problemID);
        }
      });
    }
    resp.sols = o.solutions;
    resp.totalPage = o.totalPage;
    resp.R = R;
    resp.C = C;
    return [User.find({name: {$in: names}}), Problem.find({problemID: {$in: pids}})];
  })
  .spread(function(users, probs){
    var UC = {}, UT = {};
    var P = {};
    users.forEach(function(p){
      UC[p.name] = Comm.userCol(p.rating);
      UT[p.name] = Comm.userTit(p.rating);
    });
    probs.forEach(function(p){
      P[p.problemID] = p;
    });
    resp.UC = UC;
    resp.UT = UT;
    resp.P = P;
    return res.render('status', resp);
  })
  .fail(function(err){
    if (ret === ERR.REDIRECT) {
      return res.redirect('/status');
    }
    FailRender(err, res, ret);
  })
  .done();
});

/*
 * 获取某个提交的CE信息
 */
router.post('/CE', function(req, res){
  var rid = parseInt(req.body.rid, 10);
  var name = req.session.user ? req.session.user.name : '';
  var ret = ERR.SYS;
  Q.fcall(function(){
    if (!name) {
      ret = ERR.INVALID_SESSION;
      throw new Error('invalid session.');
    }
    if (!rid) {
      ret = ERR.ARGS;
      throw new Error('invalid args.');
    }
    return Solution.findOne({runID: rid});
  })
  .then(function(sol){
    if (!sol) {
      ret = ERR.NOT_EXIST;
      throw new Error('solution NOT exist.');
    }
    if (name !== 'admin' && name !== sol.userName) {
      ret = ERR.ACCESS_DENIED;
      throw new Error('access denied.');
    }
    return res.send({ret: ERR.OK, msg: sol.CE});
  })
  .fail(function(err){
    FailProcess(err, res, ret);
  })
  .done();
});

/*
 * 获取一批提交的评测结果
 */
router.post('/batchresult', function(req, res){
  var solutions;
  var name = req.session.user ? req.session.user.name : '';
  var ret = ERR.SYS;
  Q.fcall(function(){
    if (!Array.isArray(req.body.rid_list)) {
      ret = ERR.ARGS;
      throw new Error('invalid args.');
    }
    var rid_list = [];
    req.body.rid_list.forEach(function(str){
      var rid = parseInt(str, 10);
      if (rid) {
        rid_list.push(rid);
      }
    });
    if (rid_list.length > 100 || rid_list.length < 1) {
      ret = ERR.ARGS;
      throw new Error('invalid args.');
    }
    return Solution.find({runID: {$in: rid_list}});
  })
  .then(function(docs){
    solutions = docs;
    var cids = [];
    solutions.forEach(function(p, i){
      cids.push(p.cID);
    });
    return Contest.find({contestID: {$in: cids}});
  })
  .then(function(contests){
    var canSee = {};
    contests.forEach(function(p){
      if (name === p.userName || Comm.isEnded(p)) {
        canSee[p.contestID] = true;
      }
    });
    var sols = {};
    solutions.forEach(function(p, i){
      var time, memory;
      if (p.cID === -1 || name === 'admin' || name === p.userName || canSee[p.cID]) {
        time = p.time;
        memory = p.memory;
      } else {
        time = memory = '---';
      }
      sols[p.runID] = {result: p.result, time: time, memory: memory, userName: p.userName};
    });
    return res.send({ret: ERR.OK, sols: sols});
  })
  .fail(function(err){
    FailProcess(err, res, ret);
  })
  .done();
});

/*
 * 获取某个比赛的提交(列表)
 */
router.post('/get', function(req, res){
  var cid = parseInt(req.body.cid, 10);
  var pid = parseInt(req.body.pid, 10);
  var page = parseInt(req.body.page, 10);
  var result = parseInt(req.body.result, 10);
  var name = req.session.user ? req.session.user.name : '';
  var resp = {
    ret: ERR.OK,
    svrTime: (new Date()).getTime()
  };
  var ret = ERR.SYS;
  Q.fcall(function(){
    if (!page) {
      page = 1;
    }
    if (!cid || page < 0) {
      ret = ERR.ARGS;
      throw new Error('invalid args.');
    }
    var cond = {cID: cid};
    if (req.body.name) {
      cond.userName = Comm.clearSpace(req.body.name);
    }
    if (pid) {
      cond.problemID = pid;
    }
    if (result >= 0) {
      if (result === 9) {
        cond.result = { $in : [9, 10, 11, 12, 15] };
      } else {
        cond.result = result;
      }
    }
    if (name !== 'admin') {
      cond.$nor = [{userName: 'admin'}];
    }
    return [Contest.watch(cid), Solution.get(cond, page)];
  })
  .spread(function(contest, o){
    if (!contest) {
      ret = ERR.NOT_EXIST;
      throw new Error('contest NOT exist.');
    }
    var sols = [];
    var names = [];
    var has = {};
    o.solutions.forEach(function(p, i){
      var time = '';
      var memory = '';
      var len = '';
      if (name === p.userName || name === contest.userName || Comm.isEnded(contest)) {
        time = p.time;
        memory = p.memory;
        len = p.length;
      }
      sols.push({
        runID: p.runID,
        userName: p.userName,
        problemID: p.problemID,
        result: p.result,
        time: time,
        memory: memory,
        language: p.language,
        length: len,
        inDate: p.inDate
      });
      if (!has[p.userName]) {
        has[p.userName] = true;
        names.push(p.userName);
      }
    });
    resp.contestants = contest.contestants.length;
    resp.startTime = contest.startTime;
    resp.duration = contest.len * 60;
    resp.reg_state = Comm.getRegState(contest, name);
    resp.pageNum = o.totalPage;
    resp.sols = sols;
    return User.find({name: {$in: names}});
  })
  .then(function(users){
    var rt = {};
    users.forEach(function(p){
      rt[p.name] = p.rating;
    });
    resp.ratings = rt;
    return res.send(resp);
  })
  .fail(function(err){
    FailProcess(err, res, ret);
  })
  .done();
});

module.exports = router;
