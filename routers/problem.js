
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
var Logic = require('../logic');
var ERR = Comm.ERR;
var FailRender = Comm.FailRender;
var FailProcess = Comm.FailProcess;

/*
 * problem页面
 */
router.get('/', function(req, res){
  var pid = parseInt(req.query.pid, 10);
  var name = req.session.user ? req.session.user.name : '';
  var resp = {
    title: 'Problem ' + pid,
    key: KEY.PROBLEM,
    pvl: 0,
    Tag: Tag,
    PT: ProTil,
    langs: languages
  };
  var ret = ERR.SYS;
  Q.fcall(function(){
    if (!pid) {
      ret = ERR.PAGE_NOT_FOUND;
      throw new Error('page not found.');
    }
    return [
      Solution.findOne({problemID: pid, userName: name, result: 2}),
      Problem.watch(pid)
    ];
  })
  .spread(function(solution, problem) {
    if (!problem) {
      ret = ERR.PAGE_NOT_FOUND;
      throw new Error('page not found.');
    }
    if (problem.hide === true && name !== 'admin' && name !== problem.manager) {
      ret = ERR.ACCESS_DENIED;
      throw new Error('access denied.');
    }
    if (solution || name === 'admin' || name === problem.manager) {
      resp.pvl = 1;
    }
    if (!problem.manager) {
      problem.manager = 'admin';
    }
    resp.problem = problem;
    return User.watch(problem.manager);
  })
  .then(function(user){
    if (!user) {
      throw new Error('date error.');
    }
    resp.UT = Comm.userTit(user.rating);
    resp.UC = Comm.userCol(user.rating);
    res.render('problem', resp);
  })
  .fail(function(err){
    FailRender(err, res, ret);
  });
})

/*
 * 上传代码
 */
router.post('/uploadCode', function(req, res){
  var name = req.session.user ? req.session.user.name : '';
  var pid = parseInt(req.query.pid, 10);
  var lang = parseInt(req.body.lang, 10);
  var now = (new Date()).getTime();
  var path = null;
  var sz = null;
  var code = null;
  var ret = ERR.SYS;
  Q.fcall(function(){
    if (!name) {
      ret = ERR.INVALID_SESSION;
      throw new Error('invalid session.');
    }
    if (!lang || lang < 1 || lang >= languages.length ||
        !pid || !req.files || !req.files.info) {
      ret = ERR.ARGS;
      throw new Error('invalid args.');
    }
    path = req.files.info.path;
    sz = req.files.info.size;
    if (!path || !sz) {
      ret = ERR.ARGS;
      throw new Error('invalid args.');
    }
    if (sz < 50) {
      ret = ERR.ARGS;
      throw new Error('too small. (<50B)');
    }
    if (sz > 65535){
      ret = ERR.ARGS;
      throw new Error('too large. (>65535B)');
    }
    if (req.session.submitTime && now - req.session.submitTime <= 5000) {
      ret = ERR.FREQ_LIMIT;
      throw new Error('too frequent, please submit later.');
    }
    return Logic.ReadFile(fs, path);
  })
  .then(function(data){
    code = String(data);
    if (lang < 3 && !req.body.ignore_i64 && code.indexOf("%I64") >= 0) {
      ret = ERR.WARNNING;
      throw new Error('warnning.');
    }
    req.session.submitTime = now;
    return Problem.watch(pid);
  })
  .then(function(problem){
    if (!problem) {
      ret = ERR.ARGS;
      throw new Error('invalid args.');
    }
    return IDs.get('runID');
  })
  .then(function(id){
    return [
      (new Solution({
        runID: id,
        problemID: pid,
        userName: name,
        inDate: now,
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
    fs.unlink(path);
    req.session.msg = 'The code for problem '+pid+' has been submited successfully!';
    res.send({ret: ERR.OK});
  })
  .fail(function(err){
    if (path) {
      fs.unlink(path);
    }
    FailProcess(err, res, ret);
  })
  .done();
});

/*
 * 题目列表页面
 */
router.get('/list', function(req, res){
  var name = req.session.user ? req.session.user.name : '';
  var page = parseInt(req.query.page, 10);
  var search = Comm.clearSpace(req.query.search);
  var cond1 = {};
  var cond2 = {};
  var cond3 = {};
  var cond = {};

  if (search) {
    var pattern = new RegExp("^.*"+Comm.toEscape(search)+".*$", 'i');
    var tag = [];
    for (i = 0; i < Tag.length; i++) {
      if (pattern.test(Tag[i])) {
        tag.push(i);
      }
    }
    cond1.title = pattern;
    cond2.tags = {$in: tag};
    cond3.source = pattern;
  }

  if (!name) {
    cond = {
      $or: [cond1, cond2, cond3],
      hide: false
    };
  } else if (name !== 'admin') {
    cond = {
      $and: [
        {$or: [cond1, cond2, cond3]},
        {$or: [{hide: false}, {manager: name}]}
      ]
    };
  } else {
    cond = {$or: [cond1, cond2, cond3]};
  }

  var resp = {
    title: 'ProblemList',
    key: KEY.PROBLEM_LIST,
    search: search,
    Tag: Tag,
    Pt: ProTil
  };

  var ret = ERR.SYS;
  Q.fcall(function(){
    if (!page) {
      page = 1;
    } else if (page < 0) {
      ret = ERR.REDIRECT;
      throw new Error('redirect.');
    }
    resp.page = page;
    return Problem.get(cond, page);
  })
  .then(function(o){
    resp.problems = o.problems;
    resp.totalPage = o.totalPage;
    var pids = [];
    o.problems.forEach(function(p){
      pids.push(p.problemID);
    });
    return Solution.aggregate([
      {$match: {userName: name, result: {$gt: 1}, problemID: {$in: pids}}},
      {$group: {_id: '$problemID', result: {$min: '$result'}}},
      {$sort: {_id: 1}}
    ]);
  })
  .then(function(sols){
    var Result = {};
    sols.forEach(function(p){
      if (p.result === 2) {
        Result[p._id] = 2;
      } else {
        Result[p._id] = 1;
      }
    });
    resp.Result = Result;
    res.render('problemlist', resp);
  })
  .fail(function(err){
    if (ret === ERR.REDIRECT) {
      return res.redirect('/problem/list');
    }
    FailRender(err, res, ret);
  })
  .done();
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
      ret = ERR.NOT_EXIT;
      throw new Error('problem NOT exist.');
    }
    if (!contest) {
      if (problem.hide && name !== 'admin' && name !== problem.manager) {
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
  var name = req.session.user ? req.session.user.name : '';
  var pid = parseInt(req.body.pid, 10);
  var resp = {ret: ERR.OK, msg: 'Problem '+pid+' has been Updated successfully!'};
  var ret = ERR.SYS;
  Q.fcall(function(){
    if (!name) {
      ret = ERR.INVALID_SESSION;
      throw new Error('invalid session.');
    }
    if (!pid) {
      ret = ERR.ARGS;
      throw new Error('invalid args.');
    }
    return Problem.watch(pid);
  })
  .then(function(problem){
    if (!problem) {
      ret = ERR.NOT_EXIT;
      throw new Error('problem NOT exist.');
    }
    if (name !== 'admin' && name !== problem.manager) {
      ret = ERR.ACCESS_DENIED;
      throw new Error('access denied.');
    }
    problem.hide = !problem.hide;
    resp.hide = problem.hide;
    return Logic.SaveDoc(problem);
  })
  .then(function(){
    return res.send(resp);
  })
  .fail(function(err){
    FailProcess(err, res, ret);
  })
  .done();
});

/*
 * 编辑一个题目的标签
 */
router.post('/editTag', function(req, res){
  var name = req.session.user ? req.session.user.name : '';
  var pid = parseInt(req.body.pid, 10);
  var tag = parseInt(req.body.tag, 10);
  Q.fcall(function(){
    if (!name) {
      ret = ERR.INVALID_SESSION;
      throw new Error('invalid session.');
    }
    if (!pid || !tag || tag < 1 || tag > Tag.length) {
      ret = ERR.ARGS;
      throw new Error('invalid args.');
    }
    return [
      Problem.watch(pid),
      Solution.findOne({problemID: pid, userName: name, result: 2})
    ];
  })
  .spread(function(problem, sol){
    if (!problem) {
      ret = ERR.NOT_EXIT;
      throw new Error('problem NOT exist.');
    }
    if (req.body.add && problem.tags.length >= 5) {
      ret = ERR.ARGS;
      throw new Error('too manay tags.');
    }
    if (!sol && name !== 'admin' && name !== problem.manager) {
      ret = ERR.ACCESS_DENIED;
      throw new Error('access denied.');
    }
    var cond;
    if (req.body.add) {
      cond = {$addToSet: {tags: tag}};
    } else {
      cond = {$pull: {tags: tag}};
    }
    return Problem.update(pid, cond);
  })
  .then(function(){
    req.session.msg = 'tags has been updated successfully.';
    res.send({ret: ERR.OK});
  })
  .fail(function(err){
    FailProcess(err, res, ret);
  })
  .done();
});

/*
 * 设置某个题目的管理员
 */
router.post('/setManager', function(req, res){
  var name = req.session.user ? req.session.user.name : '';
  var pid = parseInt(req.body.pid, 10);
  var username = Comm.clearSpace(req.body.username);
  Q.fcall(function(){
    if (name !== 'admin') {
      ret = ERR.ACCESS_DENIED;
      throw new Error('access denied.');
    }
    if (!pid || !username) {
      ret = ERR.ARGS;
      throw new Error('invalid args.');
    }
    return User.watch(username);
  })
  .then(function(user){
    if (!user) {
      ret = ERR.NOT_EXIT;
      throw new Error('user NOT exist.');
    }
    return Problem.update(pid, {$set: {manager: user.name}});
  })
  .then(function(){
    res.send({ret: ERR.OK, msg: 'manager has been updated successfully.'});
  })
  .fail(function(err){
    FailProcess(err, res, ret);
  })
  .done();
});

module.exports = router;
