
var router = require('express').Router();
var async = require('async');

var User = require('../models/user.js');
var Solution = require('../models/solution.js');
var Problem = require('../models/problem.js');
var Contest = require('../models/contest.js');

var Settings = require('../settings');
var languages = Settings.languages;

var KEY = require('./key');
var Comm = require('../comm');
var LogErr = Comm.LogErr;
var userCol = Comm.userCol;
var userTit = Comm.userTit;
var solCol = Comm.solCol;
var solRes = Comm.solRes;
var getRegState = Comm.getRegState;

/*
 * Status页面
 */
router.get('/', function(req, res){
  var cond = {}, page, name, pid, result, lang;

  page = parseInt(req.query.page, 10);
  if (!page) {
    page = 1;
  } else if (page < 0) {
    return res.redirect('/status');
  }

  name = Comm.clearSpace(req.query.name);
  if (name) {
    cond.userName = Comm.toEscape(name);
  }

  pid = parseInt(req.query.pid, 10);
  if (pid) cond.problemID = pid;

  result = parseInt(req.query.result, 10);
  if (result < 0 || result > 15) {
    return res.redirect('/status');
  }
  if (result >= 0) {
    if (result == 9) {
      cond.result = { $in : [9, 10, 11, 12, 15] };
    } else {
      cond.result = result;
    }
  }

  lang = parseInt(req.query.lang, 10);
  if (lang) {
    if (lang < 1 || lang >= languages.length) {
      return res.redirect('/status');
    }
    cond.language = lang;
  }

  Solution.get(cond, page)
  .then(function(o) {
    var flg = false, has = {};
    var names = new Array(), pids = new Array();
    var R = new Array(), C = new Array();
    if (o.solutions) {
      o.solutions.forEach(function(p, i){
        R.push(solRes(p.result));
        C.push(solCol(p.result));
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
    User.find({name: {$in: names}}, function(err, users){
      if (err) {
        LogErr(err);
        req.session.msg = '系统错误！';
        return res.redirect('/');
      }
      var UC = {}, UT = {};
      users.forEach(function(p){
        UC[p.name] = userCol(p.rating);
        UT[p.name] = userTit(p.rating);
      });
      Problem.find({problemID: {$in: pids}})
      .then(function(probs){
        var P = {};
        probs.forEach(function(p){
          P[p.problemID] = p;
        });
        res.render('status', {
          title: 'Status',
          key: KEY.STATUS,
          n: o.totalPage,
          sols: o.solutions,
          getDate: Comm.getDate,
          name: name,
          pid: pid,
          result: result,
          lang: lang,
          Res: solRes,
          Col: solCol,
          P: P,
          R: R,
          C: C,
          UC: UC,
          UT: UT,
          page: page,
          langs: languages
        });
      })
      .fail(function(err){
        FailRedirect(err, req, res);
      });
    });
  })
  .fail(function(err){
    FailRedirect(err, req, res);
  });
});

/*
 * 获取某个提交的CE信息
 */
router.post('/CE', function(req, res){
  res.header('Content-Type', 'text/plain');
  if (!req.session.user)
    return res.end('Please login first!');
  var rid = parseInt(req.body.rid, 10);
  var name = req.session.user.name;
  if (!rid) {
    return res.end();  //not allow
  }
  Solution.findOne({runID: rid})
  .then(function(solution){
    if (!solution) {
      return res.end(); //not allow
    }
    if (name != 'admin' && name != solution.userName) {
      return res.end('You have no permission to watch that Information!');
    }
    return res.end(solution.CE);
  })
  .fail(function(err){
    LogErr(err);
    return res.end('系统错误！');
  });
});

/*
 * 获取一批提交的评测结果
 */
router.post('/batchresult', function(req, res){
  res.header('Content-Type', 'text/plain');
  var rid_list = [];
  if (req.body.rid_list) {
    req.body.rid_list.forEach(function(str){
      var rid = parseInt(str, 10);
      if (rid) {
        rid_list.push(rid);
      }
    });
  }
  if (rid_list.length > 100 || rid_list.length < 1) {
    return res.end();  //not allow
  }
  Solution.find({runID: {$in: rid_list}})
  .then(function(solutions){
    var cids = [];
    solutions.forEach(function(p, i){
      cids.push(p.cID);
    });
    var name = '';
    if (req.session.user) {
      name = req.session.user.name;
    }
    Contest.find({contestID: {$in: cids}})
    .then(function(contests){
      var canSee = {};
      contests.forEach(function(p){
        if (name == p.userName || Comm.isEnded(p)) {
          canSee[p.contestID] = true;
        }
      });
      var sols = {};
      solutions.forEach(function(p, i){
        var t, m;
        if (name == 'admin' || name == p.userName || canSee[p.cID]) {
          t = p.time; m = p.memory;
        } else {
          t = m = '---';
        }
        sols[p.runID] = {result: p.result, time: t, memory: m, userName: p.userName};
      });
      return res.json(sols);
    })
    .fail(function(err){
      LogErr(err);
      return res.end();  //not refresh!
    });
  })
  .fail(function(err){
    LogErr(err);
    return res.end();  //not refresh!
  });
});

/*
 * 获取某个比赛的提交(列表)
 */
router.post('/get', function(req, res){
  res.header('Content-Type', 'text/plain');
  var cid = parseInt(req.body.cid, 10);
  if (!cid) {
    return res.end(); //not allow!
  }

  var cond = {cID: cid}, page, name, pid, result, lang;

  page = parseInt(req.body.page, 10);
  if (!page) {
    page = 1;
  } else if (page < 0) {
    return res.end(); //not allow!
  }

  name = String(req.body.name);
  if (name) {
    cond.userName = String(req.body.name);
  }

  pid = parseInt(req.body.pid, 10);
  if (pid) {
    cond.problemID = pid;
  }

  result = parseInt(req.body.result, 10);
  if (result >= 0) {
    if (result === 9) {
      cond.result = { $in : [9, 10, 11, 12, 15] };
    } else {
      cond.result = result;
    }
  }

  lang = parseInt(req.body.lang, 10);
  if (lang) {
    cond.language = lang;
  }

  name = req.session.user ? req.session.user.name : '';
  if (name !== 'admin') {
    cond.$nor = [{userName: 'admin'}];
  }

  var contest, solutions, cnt;
  var arr = [
    function(cb) {
      Contest.watch(cid)
      .then(function(con){
        contest = con;
        return cb();
      })
      .fail(function(err){
        return cb(err);
      });
    },
    function(cb) {
      Solution.get(cond, page)
      .then(function(o) {
        solutions = o.solutions;
        cnt = o.totalPage;
        return cb();
      })
      .fail(function(err){
        return cb(err);
      });
    }
  ];

  async.each(arr, function(func, cb){
    func(cb);
  }, function(err){
    if (err) {
      LogErr(err);
      return res.end();
    }
    if (!contest || cnt < 0) {
      return res.end(); //not allow
    }
    var sols = new Array(), names = new Array(), has = {};
    solutions.forEach(function(p, i){
      var T = '', M = '', L = '';
      if (name === p.userName || name === contest.userName || Comm.isEnded(contest)) {
        T = p.time; M = p.memory; L = p.length;
      }
      sols.push({
        runID: p.runID,
        userName: p.userName,
        problemID: p.problemID,
        result: p.result,
        time: T,
        memory: M,
        language: p.language,
        length: L,
        inDate: p.inDate
      });
      if (!has[p.userName]) {
        has[p.userName] = true;
        names.push(p.userName);
      }
    });
    User.find({name: {$in: names}}, function(err, users){
      if (err) {
        LogErr(err);
        return res.end();
      }
      var rt = {};
      users.forEach(function(p){
        rt[p.name] = p.rating;
      });
      return res.json({
        sols: sols,
        pageNum: cnt,
        ratings: rt,
        startTime: contest.startTime,
        reg_state: getRegState(contest, name),
        contestants: contest.contestants.length,
        duration: contest.len * 60,
        svrTime: (new Date()).getTime()
      });
    });
  });
});

module.exports = router;
