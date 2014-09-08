
var router = require('express').Router();

var Solution = require('../models/solution.js');
var Problem = require('../models/problem.js');
var User = require('../models/user.js');

var KEY = require('./key');
var Settings = require('../settings');
var languages = Settings.languages;
var stats_pageNum = Settings.stats_pageNum;
var Comm = require('../comm');
var LogErr = Comm.LogErr;

/*
 * Statistic页面
 */
router.get('/:pid', function(req, res) {
  var pid = parseInt(req.params.pid, 10);
  if (!pid) {
    return res.redirect('/404');
  }
  var page = parseInt(req.query.page, 10);
  if (!page) {
    page = 1;
  } else if (page < 0) {
    return res.redirect('/statistic/'+pid);
  }
  Problem.watch(pid, function(err, problem){
    if (err) {
      LogErr(err);
      req.session.msg = '系统错误！';
      return res.redirect('/');
    }
    var user = "";
    if (req.session.user) {
      user = req.session.user.name;
    }
    if (!problem || (problem.hide && user!== problem.manager && user !== 'admin')) {
      return res.redirect('/404');
    }
    var lang = parseInt(req.query.lang, 10), Q = {problemID:pid, result:2};
    if (lang < 1 || lang >= languages.length) {
      return res.redirect('/statistic/'+pid);
    }
    if (lang) {
      Q.language = lang;
    }
    Solution.distinct('userName', Q, function(err, users){
      if (err) {
        LogErr(err);
        req.session.msg = '系统错误！';
        return res.redirect('/');
      }
      var n = 0;
      if (users) n = users.length;
      if ((page-1)*stats_pageNum > n) {
        return res.redirect('/statistic/'+pid);
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
      var Q1 = {problemID: pid, result: 2};
      var Q2 = {problemID: pid, result: {$gt: 1}};
      if (lang) {
        Q1.language = Q2.language = lang;
      }
      Solution.aggregate([{
        $match: Q1
      }, {$sort: sq}, {
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
      }, {$sort: sq}, {$skip: (page-1)*stats_pageNum}, {$limit: 20}
      ], function(err, sols){
        if (err) {
          LogErr(err);
          req.session.msg = '系统错误！';
          return res.redirect('/');
        }
        var names = new Array();
        if (sols) {
          sols.forEach(function(p){
            names.push(p._id);
          });
        }
        var N = {}, sum = 0, Q = {problemID: pid};
        Solution.aggregate([
          {$match : Q2}
        , {$group : { _id: '$result', val: {$sum:1} }}
        ], function(err, results){
          if (err) {
            LogErr(err);
            req.session.msg = '系统错误！';
            return res.redirect('/');
          }
          if (results) {
            var sum = 0;
            results.forEach(function(p, i){
              if (p._id > 8 && p._id < 13) {
                i = 9;
              } else {
                i = p._id;
              }
              if (!N[i]) {
                N[i] = p.val;
              } else {
                N[i] += p.val;
              }
              sum += p.val;
            });
            N[0] = sum;
          }
          User.find({name: {$in:names}}, function(err, users){
            if (err) {
              LogErr(err);
              req.session.msg = '系统错误！';
              return res.redirect('/');
            }
            var UC = {}, UT = {};
            if (users) {
              users.forEach(function(p){
                UC[p.name] = Comm.userCol(p.rating);
                UT[p.name] = Comm.userTit(p.rating);
              });
            }
            res.render('statistic', {
              title: 'Problem Statistic',
              key: KEY.STATISTIC,
              pid: pid,
              sols: sols,
              getDate: Comm.getDate,
              N: N,
              Res: Comm.solRes,
              page: page,
              pageNum: stats_pageNum,
              n: parseInt((n + stats_pageNum - 1) / stats_pageNum, 10),
              lang: lang,
              sort_key: sort_key,
              UC: UC,
              UT: UT,
              langs: languages
            });
          });
        });
      });
    });
  });
});

module.exports = router;
