
var router = require('express').Router();
var fs = require('fs');
var async = require('async');

var IDs = require('../models/ids.js');
var User = require('../models/user.js');
var Solution = require('../models/solution.js');
var Problem = require('../models/problem.js');
var Contest = require('../models/contest.js');

var KEY = require('./key');
var Settings = require('../settings');
var Tag = Settings.T;
var ProTil = Settings.P;
var languages = Settings.languages;
var Comm = require('../comm');
var LogErr = Comm.LogErr;
var getRegState = Comm.getRegState;

/*
 * problem页面
 */
router.get('/', function(req, res){
  var pid = parseInt(req.query.pid, 10);
  if (!pid) {
    res.render('problem', {
      title: 'Problem',
      key: KEY.HOME,
      problem: null
    });
  } else {
    var name = '', cid = parseInt(req.query.cid, 10);
    if (req.session.user) {
      name = req.session.user.name;
    }
    Solution.watch({problemID:pid, userName:name, result:2}, function(err, solution) {
      if (err) {
        LogErr(err);
        req.session.msg = '系统错误！';
        return res.redirect('/');
      }
      var pvl = 0;
      if (solution) {
        pvl = 1;
      }
      Problem.watch(pid, function(err, problem) {
        if (err) {
          LogErr(err);
          req.session.msg = '系统错误！';
          return res.redirect('/');
        }
        var RP = function(U){
          var UT, UC;
          if (U) {
            UT = Comm.userTit(U.rating);
            UC = Comm.userCol(U.rating);
          }
          res.render('problem', {
            title: 'Problem ' + pid,
            key: KEY.PROBLEM,
            problem: problem,
            pvl: pvl,
            Tag: Tag,
            PT: ProTil,
            cid: cid,
            UT: UT,
            UC: UC,
            langs: languages
          });
        };
        if (problem) {
          if (pvl == 0 && (name == 'admin' || problem.manager == name)) {
            pvl = 1;
          }
          if (problem.hide == true && (!req.session.user ||
            (req.session.user.name != 'admin' && req.session.user.name != problem.manager))) {
            problem = null;
            return RP(null);
          }
          if (!problem.manager) {
            problem.manager = 'admin';
          }
          User.watch(problem.manager, function(err, user){
            if (err) {
              LogErr(err);
              req.session.msg = '系统错误！';
              return res.redirect('/');
            }
            return RP(user);
          });
        } else {
          return RP(null);
        }
      });
    });
  }
})

/*
 * 上传代码
 */
router.post('/uploadCode', function(req, res){
  res.header('Content-Type', 'text/plain');
  if (!req.files || !req.files.info) {
    return res.end();  //not allow
  }
  var path = req.files.info.path;
  var sz = req.files.info.size;
  var RP = function(s) {
    fs.unlink(path, function(){
      return res.end(s);
    });
  };
  if (!req.session.user) {
    req.session.msg = 'Failed! Please login first!';
    return RP('4');    //refresh!
  }
  var pid = parseInt(req.query.pid, 10);
  if (!pid) {
    return RP();    //not allow!
  }
  var lang = parseInt(req.body.lang, 10);
  if (!lang || lang < 1 || lang >= languages.length) {
    return RP('5'); //language not exist
  }
  if (sz < 50) {
    return RP('1');
  }
  if (sz > 65535){
    return RP('2');
  }
  var now = (new Date()).getTime();
  if (req.session.submitTime && now - req.session.submitTime <= 5000) {
    return RP('7');
  }
  fs.readFile(path, function(err, data){
    if (err) {
      LogErr(err);
      return RP('3');
    }
    var code = String(data);
    if (lang < 3 && !req.body.ignore_i64 && code.indexOf("%I64") >= 0) {
      return RP('6'); //i64 alert
    }
    req.session.submitTime = now;
    Problem.watch(pid, function(err, problem){
      if (err) {
        LogErr(err);
        return RP('3');
      }
      if (!problem) {
        return RP();  //not allow!
      }
      var name = req.session.user.name;
      IDs.get ('runID', function(err, id){
        if (err) {
          LogErr(err);
          return RP('3');
        }
        var newSolution = new Solution({
          runID: id,
          problemID: pid,
          userName: name,
          inDate: (new Date()).getTime(),
          language: lang,
          length: code.length,
          cID: -1,
          code: code
        });
        newSolution.save(function(err){
          if (err) {
            LogErr(err);
            return RP('3');
          }
          Problem.update(pid, {$inc: {submit: 1}}, function(err){
            if (err) {
              LogErr(err);
              return RP('3');
            }
            User.update({name: name}, {$inc: {submit: 1}}, function(err){
              if (err) {
                LogErr(err);
                return RP('3');
              }
              req.session.msg = 'The code for problem '+pid+' has been submited successfully!';
              return RP();
            });
          });
        });
      });
    });
  });
});

/*
 * 题目列表页面
 */
router.get('/list', function(req, res){
  var page = parseInt(req.query.page, 10);
  if (!page) {
    page = 1;
  } else if (page < 0) {
    return res.redirect('/problem/list');
  }

  var q1 = {}, q2 = {}, q3 = {}, Q, search = Comm.clearSpace(req.query.search);

  if (search) {
    var pattern = new RegExp("^.*"+Comm.toEscape(search)+".*$", 'i'), tag = new Array();
    for (i = 0; i < Tag.length; i++) {
      if (pattern.test(Tag[i])) {
        tag.push(i);
      }
    }
    q1.title = pattern;
    q2.tags = {$in: tag};
    q3.source = pattern;
  }

  if (!req.session.user) {
    Q = { $or:[q1, q2, q3], hide:false };
  } else if (req.session.user.name != 'admin') {
    Q = { $and: [{$or:[q1, q2, q3]}, {$or:[{hide:false}, {manager:req.session.user.name}]}] };
  } else {
    Q = { $or:[q1, q2, q3] };
  }
  Problem.get(Q, page, function(err, problems, n) {
    if (err) {
      LogErr(err);
      req.session.msg = '系统错误！';
      return res.redirect('/');
    }
    if (n < 0) {
      return res.redirect('/problem/list');
    }
    var RP = function(R){
      res.render('problemlist', {
        title: 'ProblemList',
        key: KEY.PROBLEM_LIST,
        n: n,
        problems: problems,
        page: page,
        search: search,
        Tag: Tag,
        Pt: ProTil,
        R: R
      });
    };
    if (req.session.user && problems && problems.length > 0) {
      var pids = new Array(), R = {};
      problems.forEach(function(p){
        pids.push(p.problemID);
      });
      Solution.aggregate([
      { $match: { userName: req.session.user.name, result:{$gt:1} } }
    , { $group: { _id: '$problemID', result: {$min: '$result'} } }
    , { $sort: { _id: 1 } }
      ], function(err, sols){
        if (err) {
          LogErr(err);
          req.session.msg = '系统错误！';
          return res.redirect('/');
        }
        if (sols) {
          sols.forEach(function(p){
            if (p.result == 2) {
              R[p._id] = 2;
            } else {
              R[p._id] = 1;
            }
          });
          return RP(R);
        }
      });
    } else {
      return RP({});
    }
  });
});

/*
 * 如果cid为空，获取一个题目的title (addcontest)
 * 否则，获取一个题目的全部信息，供比赛使用
 */
router.post('/get', function(req, res){
  res.header('Content-Type', 'text/plain');
  var pid = parseInt(req.body.pid, 10);
  if (!pid) {
    return res.end();  //not allow!
  }

  var name = req.session.user ? req.session.user.name : '';
  var cid = parseInt(req.body.cid, 10);
  var prob, con;
  var arr = [
    function(cb) {
      Problem.watch(pid, function(err, problem){
        prob = problem;
        return cb(err);
      });
    },
  ];
  if (cid) {
    arr.push(
      function(cb) {
        Contest.watch(cid, function(err, contest){
          con = contest;
          return cb(err);
        });
      }
    );
  }
  async.each(arr, function(func, cb){
    func(cb);
  }, function(err){
    if (err) {
      LogErr(err);
      return res.end();
    }

    if (!prob) {
      return res.end(); //not allow
    }

    //get problem title for addcontest page
    if (!cid) {
      if (prob.hide === true && name !== 'admin' && name !== prob.manager) {
        return res.end();
      }
      return res.end(prob.title);
    }

    //get a problem for contest page
    if (!con) {
      return res.end();
    }

    var now = (new Date()).getTime();
    var resp = {
      startTime: con.startTime,
      reg_state: getRegState(con, name),
      contestants: con.contestants.length,
      duration: con.len * 60,
      svrTime: now
    };

    if (name !== con.userName && name !== 'admin' && now < con.startTime) {
      resp.ret = 2;
      return res.json(resp);
    }

    var lm = parseInt(req.body.lastmodified, 10);
    if (lm && lm == prob.lastmodified) { //problem cache is ok.
      resp.ret = 0;
      return res.json(resp);
    }

    resp.ret = 1;
    resp.prob = {
      problemID: prob.problemID,
      title: prob.title,
      timeLimit: prob.timeLimit,
      memoryLimit: prob.memoryLimit,
      description: prob.description,
      input: prob.input,
      output: prob.output,
      sampleInput: prob.sampleInput,
      sampleOutput: prob.sampleOutput,
      hint: prob.hint,
      spj: prob.spj,
      TC: prob.TC,
      lastmodified: prob.lastmodified,
    };
    return res.json(resp);
  });
});

/*
 * 切换一个题目的隐藏状态
 */
router.post('/toggleHide', function(req, res){
  res.header('Content-Type', 'text/plain');
  if (!req.session.user) {
    req.session.msg = 'Please login first!';
    return res.end();
  }
  var pid = parseInt(req.body.pid, 10);
  if (!pid) {
    return res.end(); //not allow
  }
  Problem.watch(pid, function(err, problem){
    if (err) {
      LogErr(err);
      return res.end('3');
    }
    if (!problem) {
      return res.end(); //not allow
    }
    var name = req.session.user.name;
    if (name != 'admin' && name != problem.manager) {
      req.session.msg = 'You have no permission to do that!';
      return res.end();
    }
    problem.hide = !problem.hide;
    problem.save(function(err){
      if (err) {
        LogErr(err);
        return res.end('3');
      }
      if (problem.hide)
        return res.end('h');
      return res.end('s');
    });
  });
});

/*
 * 编辑一个题目的标签
 */
router.post('/editTag', function(req, res){
  res.header('Content-Type', 'text/plain');
  if (!req.session.user) {
    req.session.msg = 'Please login first!';
    return res.end();
  }
  var pid = parseInt(req.body.pid, 10);
  var tag = parseInt(req.body.tag, 10);
  if (!pid || !tag) {
    return res.end();  //not allow
  }
  var name = req.session.user.name;
  var RP = function(){
    var Q;
    if (req.body.add) {
      Q = {$addToSet: {tags: tag}};
    } else {
      Q = {$pull: {tags: tag}};
    }
    Problem.update(pid, Q, function(err, problem){
      if (err) {
        LogErr(err);
        req.session.msg = '系统错误！';
        return res.end();
      }
      if (req.body.add) {
        req.session.msg = 'Tag has been added to the problem successfully!';
      } else {
        req.session.msg = 'Tag has been removed from the problem successfully!';
      }
      return res.end();
    });
  };
  Problem.watch(pid, function(err, problem){
    if (err) {
      LogErr(err);
      req.session.msg = '系统错误！';
      return res.end();
    }
    if (!problem) {
      return res.end();  //not allow
    }
    if (req.body.add && problem.tags.length >= 5) {
      req.session.msg = 'The number of tags should not larger than 5!';
      return res.end();
    }
    if (name == 'admin' || name == problem.manager) {
      return RP();
    }
    Solution.watch({problemID: pid, userName: name, result: 2}, function(err, solution) {
      if (err) {
        LogErr(err);
        req.session.msg = '系统错误！';
        return res.end();
      }
      if (!solution) {
        return res.end(); //not allow
      }
      return RP();
    });
  });
});

/*
 * 设置某个题目的管理员
 */
router.post('/setManager', function(req, res){
  res.header('Content-Type', 'text/plain');
  if (!req.session.user) {
    req.session.msg = 'Please login first!';
    return res.end();
  }
  if (req.session.user.name != 'admin') {
    return res.end(); //not allow
  }
  var pid = parseInt(req.body.pid, 10);
  var name = String(req.body.name);
  if (!pid || !name) {
    return res.end(); //not allow
  }
  User.watch(name, function(err, user){
    if (err) {
      LogErr(err);
      return res.end('3');
    }
    if (!user) {
      return res.end('1');
    }
    Problem.watch(pid, function(err, prob){
      if (err) {
        LogErr(err);
        return res.end('3');
      }
      if (!prob) {
        return res.end(); //not allow
      }
      prob.manager = name;
      prob.save(function(err){
        if (err) {
          LogErr(err);
          return res.end('3');
        }
        req.session.msg = 'The manager has been changed successfully!';
        return res.end();
      });
    });
  });
});

module.exports = router;
