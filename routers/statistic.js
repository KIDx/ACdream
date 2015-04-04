
var router = require('express').Router();
var Q = require('q');

var Solution = require('../models/solution.js');
var Problem = require('../models/problem.js');
var User = require('../models/user.js');

var KEY = require('./key');
var Settings = require('../settings');
var languages = Settings.languages;
var stats_pageNum = Settings.stats_pageNum;
var Comm = require('../comm');
var LogErr = Comm.LogErr;
var ERR = Comm.ERR;
var FailRender = Comm.FailRender;

/*
 * Statistic页面
 */
router.get('/:pid', function(req, res) {
  var pid = parseInt(req.params.pid, 10);
  var page = parseInt(req.query.page, 10);
  if (!page) {
    page = 1;
  } else if (page < 0) {
    return res.redirect('/statistic/'+pid);
  }
  var lang = parseInt(req.query.lang, 10);
  var cond = {problemID: pid, result: 2};
  if (lang < 1 || lang >= languages.length) {
    return res.redirect('/statistic/'+pid);
  }
  if (lang) {
    cond.language = lang;
  }
  var sort_key = parseInt(req.query.sort), sq = {};
  if (sort_key < 1 || sort_key > 2) {
    return res.redirect('/statistic/'+pid);
  }
  if (!sort_key) {
    sq = {time: 1, memory: 1, length: 1, inDate: 1};
  } else if (sort_key == 1) {
    sq = {memory: 1, time: 1, length: 1, inDate: 1};
  } else if (sort_key == 2) {
    sq = {length: 1, time: 1, memory: 1, inDate: 1};
  }
  var cond1 = {problemID: pid, result: 2};
  var cond2 = {problemID: pid, result: {$gt: 1}};
  if (lang) {
    cond1.language = cond2.language = lang;
  }
  var user = "";
  if (req.session.user) {
    user = req.session.user.name;
  }
  var resp = {
    title: 'Problem Statistic',
    key: KEY.STATISTIC,
    pid: pid,
    getDate: Comm.getDate,
    Res: Comm.solRes,
    page: page,
    pageNum: stats_pageNum,
    lang: lang,
    sort_key: sort_key,
    langs: languages
  };
  var names = [];
  var redirectUrl = null;
  var ret = ERR.SYS;
  Q.fcall(function(){
    if (!pid) {
      ret = ERR.PAGE_NOT_FOUND;
      throw new Error('page not found');
    }
  })
  .then(function(){
    return Problem.watch(pid);
  })
  .then(function(problem){
    if (!problem || (problem.hide && user !== problem.manager && user !== 'admin')) {
      ret = ERR.PAGE_NOT_FOUND;
      throw new Error('page not found');
    }
    return Solution.distinct('userName', cond);
  }).then(function(users){
    var total = users.length;
    var skip = (page - 1) * stats_pageNum;
    if (skip > total) {
      redirectUrl = '/statistic/' + pid;
      throw new Error('redirect');
    }
    resp.totalPage = Math.floor((total + stats_pageNum - 1) / stats_pageNum);
    return Solution.aggregate([{
      $match: cond1
    }, {
      $sort: sq
    }, {
      $group: {
        _id: '$userName',
        runID: {$first: '$runID'},
        cid: {$first: '$cID'},
        time: {$first: '$time'},
        memory: {$first: '$memory'},
        length: {$first: '$length'},
        language: {$first: '$language'},
        inDate: {$first: '$inDate'}
      }
    }, {
      $sort: sq
    }, {
      $skip: skip
    }, {
      $limit: stats_pageNum
    }]);
  })
  .then(function(sols){
    sols.forEach(function(p){
      names.push(p._id);
    });
    resp.sols = sols;
    return Solution.aggregate([
      { $match: cond2 },
      { $group: { _id: '$result', val: {$sum: 1} } }
    ]);
  }).then(function(results){
    var calResult = {};
    var sum = 0;
    results.forEach(function(p, i){
      if (p._id > 8 && p._id < 13) {
        i = 9;
      } else {
        i = p._id;
      }
      if (!calResult[i]) {
        calResult[i] = p.val;
      } else {
        calResult[i] += p.val;
      }
      sum += p.val;
    });
    calResult[0] = sum;
    resp.calResult = calResult;
    return User.find({name: {$in: names}});
  }).then(function(users){
    var UC = {};
    var UT = {};
    if (users) {
      users.forEach(function(p){
        UC[p.name] = Comm.userCol(p.rating);
        UT[p.name] = Comm.userTit(p.rating);
      });
    }
    resp.UC = UC;
    resp.UT = UT;
    return res.render('statistic', resp);
  })
  .fail(function(err){
    if (redirectUrl) {
      return res.redirect(redirectUrl);
    }
    FailRender(err, res, ret);
  });
});

module.exports = router;
