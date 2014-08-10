
var router = require('express').Router();
var async = require('async');

var IDs = require('../models/ids.js');
var Solution = require('../models/solution.js');
var Problem = require('../models/problem.js');
var Contest = require('../models/contest.js');
var User = require('../models/user.js');

var KEY = require('./key');
var Settings = require('../settings');
var languages = Settings.languages;
var Comm = require('../comm');
var LogErr = Comm.LogErr;

/*
 * get: submit页面
 * post: 提交代码
 */
router.route('/')
.get(function(req, res) {
  res.render('submit', {
    title: 'Submit',
    key: KEY.SUBMIT,
    id: req.query.pid,
    langs: languages
  });
})
.post(function(req, res) {
  res.header('Content-Type', 'text/plain');
  if (!req.session.user) {
    req.session.msg = 'Please login first!';
    return res.end('1');
  }
  var now = (new Date()).getTime();
  //5秒内只能提交一次
  if (req.session.submitTime && now - req.session.submitTime <= 5000) {
    return res.end('6');
  }
  req.session.submitTime = now;
  var cid = parseInt(req.body.cid, 10);
  var name = Comm.clearSpace(req.session.user.name);
  var pid = parseInt(req.body.pid, 10);
  var Str = String(req.body.code);
  var lang = parseInt(req.body.lang, 10);
  if (!name) {
    return res.end();  //not allow
  }
  if (!pid || !Str || Str.length < 50 || Str.length > 65536) {
    return res.end('4');
  }
  if (!lang || lang < 1 || lang >= languages.length) {
    return res.end('5');
  }
  var now = (new Date()).getTime();
  var RP = function(){
    IDs.get('runID', function(err, id){
      if (err) {
        LogErr(err);
        return res.end('3');
      }
      var newSolution = new Solution({
        runID: id,
        problemID: pid,
        userName: name,
        inDate: now,
        language: lang,
        length: Str.length,
        cID: cid,
        code: Str
      });
      newSolution.save(function(err){
        if (err) {
          LogErr(err);
          return res.end('3');
        }
        var arr = [
          function(cb) {
            Problem.update(pid, {$inc: {submit: 1}}, function(err){
              return cb(err);
            });
          },
          function(cb) {
            User.update({name: name}, {$inc: {submit: 1}}, function(err){
              return cb(err);
            });
          }
        ];
        async.each(arr, function(func, cb){
          func(cb);
        }, function(err){
          if (err) {
            LogErr(err);
            return res.end('3');
          }
          if (cid < 0) {
            req.session.msg = 'The code for problem '+pid+' has been submited successfully!';
          }
          return res.end();
        });
      });
    });
  };
  Problem.watch(pid, function(err, problem){
    if (err) {
      LogErr(err);
      return res.end('3');
    }
    if (!problem) {
      return res.end('4');
    }
    if (!cid) {
      cid = -1;
      return RP();
    } else {
      Contest.watch(cid, function(err, contest){
        if (err) {
          LogErr(err);
          return res.end('3');
        }
        if (!contest) {
          return res.end(); //not allow
        }
        if (contest.type == 2) {
          if (now > contest.startTime+contest.len*60000) {
            return res.end('7');
          }
          if (name != contest.userName && !Comm.isRegCon(contest.contestants, name)) {
            return res.end('2');
          }
        }
        var check = function() {
          for (var i = 0; i < contest.probs.length; i++) {
            if (pid == contest.probs[i][0]) {
              return true;
            }
          }
          return false;
        };
        if (!check()) {
          req.session.msg = 'The problem is not exist!';
          return res.end('1'); //refresh
        }
        return RP();
      });
    }
  });
});

module.exports = router;
