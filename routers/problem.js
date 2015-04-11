
var router = require('express').Router();
var fs = require('fs');
var Q = require('q');

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
var ERR = Comm.ERR;
var FailRender = Comm.FailRender;
var FailProcess = Comm.FailProcess;

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
    Solution.findOne({problemID:pid, userName:name, result:2})
    .then(function(solution) {
      var pvl = solution ? 1 : 0;
      Problem.watch(pid)
      .then(function(problem){
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
          User.watch(problem.manager)
          .then(function(user){
            return RP(user);
          })
          .fail(function(err){
            FailRender(err, res, ERR.SYS);
          });
        } else {
          return RP(null);
        }
      })
      .fail(function(err){
        FailRender(err, res, ERR.SYS);
      });
    })
    .fail(function(err){
      FailRender(err, res, ERR.SYS);
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
    Problem.watch(pid)
    .then(function(problem){
      if (!problem) {
        return RP();  //not allow!
      }
      var name = req.session.user.name;
      IDs.get ('runID')
      .then(function(id){
        return [
          (new Solution({
            runID: id,
            problemID: pid,
            userName: name,
            inDate: (new Date()).getTime(),
            language: lang,
            length: code.length,
            cID: -1,
            code: code
          })).save(),
          Problem.update(pid, {$inc: {submit: 1}}),
          User.update({name: name}, {$inc: {submit: 1}})
        ];
      })
      .then(function(){
        req.session.msg = 'The code for problem '+pid+' has been submited successfully!';
        return RP();
      })
      .fail(function(err){
        LogErr(err);
        return RP('3');
      });
    })
    .fail(function(err){
      LogErr(err);
      return RP('3');
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
  var Response = {
    title: 'ProblemList',
    key: KEY.PROBLEM_LIST,
    page: page,
    search: search,
    Tag: Tag,
    Pt: ProTil
  };
  Problem.get(Q, page)
  .then(function(o){
    Response.problems = o.problems;
    Response.n = o.totalPage;
    var RP = function(R){
      Response.R = R;
      res.render('problemlist', Response);
    };
    if (req.session.user && o.problems && o.problems.length > 0) {
      var pids = [], R = {};
      o.problems.forEach(function(p){
        pids.push(p.problemID);
      });
      Solution.aggregate([
        { $match: { userName: req.session.user.name, result:{$gt:1} } },
        { $group: { _id: '$problemID', result: {$min: '$result'} } },
        { $sort: { _id: 1 } }
      ])
      .then(function(sols){
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
      })
      .fail(function(err){
        FailRender(err, res, ERR.SYS);
      });
    } else {
      return RP({});
    }
  })
  .fail(function(err){
    FailRender(err, res, ERR.SYS);
  });
});

/*
 * 如果cid为空，获取一个题目的title (addcontest)
 * 否则，获取一个题目的全部信息，供比赛使用
 */
router.post('/get', function(req, res){
  var pid = parseInt(req.body.pid, 10);
  var name = req.session.user ? req.session.user.name : '';
  var cid = parseInt(req.body.cid, 10);
  var resp = {
    ret: ERR.OK
  };
  var ret = ERR.SYS;
  Q.fcall(function(){
    if (!pid) {
      ret = ERR.ARGS;
      throw new Error('invalid args.');
    }
    if (!cid) {
      cid = 0;
    }
    return [Problem.watch(pid), Contest.watch(cid)];
  })
  .spread(function(problem, contest){
    if (!problem) {
      ret = ERR.ARGS;
      throw new Error('problem NOT exist.');
    }
    if (!contest) {
      if (problem.hide === true && name !== 'admin' && name !== problem.manager) {
        ret = ERR.ACCESS_DENIED;
        throw new Error('access denied.');
      }
      resp.title = problem.title;
    } else {
      var now = (new Date()).getTime();
      if (name !== contest.userName && name !== 'admin' &&
          (now < contest.startTime || contest.type === 2 && contest.password && !Comm.isRegCon(contest, name))) {
        ret = ERR.ACCESS_DENIED;
        throw new Error('access denied.');
      }
      resp.startTime = contest.startTime;
      resp.reg_state = Comm.getRegState(contest, name);
      resp.contestants = contest.contestants.length;
      resp.duration = contest.len * 60;
      resp.svrTime = now;
      var lm = parseInt(req.body.lastmodified, 10);
      if (lm !== problem.lastmodified) { //problem cache is not the latest.
        resp.prob = {
          problemID: problem.problemID,
          title: problem.title,
          timeLimit: problem.timeLimit,
          memoryLimit: problem.memoryLimit,
          description: problem.description,
          input: problem.input,
          output: problem.output,
          sampleInput: problem.sampleInput,
          sampleOutput: problem.sampleOutput,
          hint: problem.hint,
          spj: problem.spj,
          TC: problem.TC,
          lastmodified: problem.lastmodified,
        };
      }
    }
  })
  .then(function(){
    res.send(resp);
  })
  .fail(function(err){
    FailProcess(err, res, ret);
  })
  .done();
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
  var resp;
  Problem.watch(pid)
  .then(function(problem){
    if (!problem) {
      return res.end(); //not allow
    }
    var name = req.session.user.name;
    if (name != 'admin' && name != problem.manager) {
      req.session.msg = 'You have no permission to do that!';
      return res.end();
    }
    problem.hide = !problem.hide;
    resp = problem.hide ? 'h' : 's';
    return problem.save();
  })
  .then(function(){
    return res.end(resp);
  })
  .fail(function(err){
    LogErr(err);
    return res.end('3');
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
    var cond;
    if (req.body.add) {
      cond = {$addToSet: {tags: tag}};
    } else {
      cond = {$pull: {tags: tag}};
    }
    Problem.update(pid, cond)
    .then(function(){
      if (req.body.add) {
        req.session.msg = 'Tag has been added to the problem successfully!';
      } else {
        req.session.msg = 'Tag has been removed from the problem successfully!';
      }
      return res.end();
    })
    .fail(function(err){
      LogErr(err);
      req.session.msg = '系统错误！';
      return res.end();
    });
  };
  Problem.watch(pid)
  .then(function(problem){
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
    Solution.findOne({problemID: pid, userName: name, result: 2})
    .then(function(solution) {
      if (!solution) {
        return res.end(); //not allow
      }
      return RP();
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
  User.watch(name)
  .then(function(user){
    if (!user) {
      return res.end('1');
    }
    Problem.update({problemID: pid}, {$set: {manager: name}})
    .then(function(){
      req.session.msg = 'The manager has been changed successfully!';
      return res.end();
    })
    .fail(function(err){
      LogErr(err);
      return res.end('3');
    });
  })
  .fail(function(err){
    LogErr(err);
    return res.end('3');
  });
});

module.exports = router;
