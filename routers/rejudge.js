
var router = require('express').Router();

var Contest = require('../models/contest.js');
var ContestRank = require('../models/contestrank.js');
var Overview = require('../models/overview.js');
var User = require('../models/user.js');
var Problem = require('../models/problem.js');
var Solution = require('../models/solution.js');

var Comm = require('../comm');
var LogErr = Comm.LogErr;

function ClearReduceData(cids, cb) {
  ContestRank.clear({'_id.cid': {$in: cids}}, function(err){
    if (err) {
      return cb(err);
    }
    Overview.remove({'_id.cid': {$in: cids}}, function(err){
      if (err) {
        return cb(err);
      }
      Contest.multiUpdate({contestID: {$in: cids}}, {$set: {
        maxRunID: 0,
        updateTime: 0,
        overviewRunID: 0,
        overviewUpdateTime: 0
      }}, function(err){
        return cb(err);
      });
    });
  });
}

/*
 * 将某个题目的所有提交rejudge
 */
router.post('/problem', function(req, res){
  res.header('Content-Type', 'text/plain');
  if (!req.session.user) {
    req.session.msg = 'Please login first!';
    return res.end();
  }
  var pid = parseInt(req.body.pid, 10);
  if (!pid) {
    return res.end();  //not allow
  }
  Problem.watch(pid, function(err, problem) {
    if (err) {
      LogErr(err);
      return res.end();
    }
    if (!problem) {
      return res.end(); //not allow
    }
    if (req.session.user.name != 'admin' && req.session.user.name != problem.manager) {
      if (!req.body.cid) {
        req.session.msg = 'Failed! You have no permission to do that.';
        return res.end();
      }
      return res.end('0');
    }
    var has = {};
    Problem.update(pid, {$set: {AC: 0}}, function(err){
      if (err) {
        LogErr(err);
        return res.end();
      }
      Solution.distinct('userName', {problemID: pid, result: 2}, function(err, users){
        if (err) {
          LogErr(err);
          return res.end();
        }
        User.multiUpdate({'name': {$in: users}}, {$inc: {solved: -1}}, function(err){
          if (err) {
            LogErr(err);
            return res.end();
          }
          Solution.update({problemID: pid}, {$set: {result: 0}}, function(err){
            if (err) {
              LogErr(err);
              return res.end();
            }
            Solution.distinct('cID', {problemID: pid, cID: {$gt: -1}}, function(err, cids){
              if (err) {
                LogErr(err);
                return res.end();
              }
              ClearReduceData(cids, function(err){
                if (err) {
                  LogErr(err);
                  return res.end();
                }
                if (!req.body.cid) {
                  req.session.msg = 'Problem '+pid+' has been Rejudged successfully!';
                  return res.end();
                }
                return res.end('1');
              });
            });
          });
        });
      });
    });
  });
});

/*
 * rejudge一个结果不是AC的提交
 */
router.post('/single', function(req, res){
  res.header('Content-Type', 'text/plain');
  if (!req.session.user) {
    req.session.msg = 'Please login first!';
    return res.end('1');
  }
  var rid = parseInt(req.body.rid, 10);
  if (!rid || req.session.user.name != 'admin') {
    return res.end(); //not allow
  }
  Solution.findOneAndUpdate({runID: rid, result: {$gt: 2}}, {$set: {result:0}}, function(err, sol){
    if (err) {
      LogErr(err);
      return res.end('3');
    }
    if (!sol) {
      return res.end(); //not allow
    }
    var cid = sol.cID;
    if (cid == -1) {
      return res.end();
    }
    ClearReduceData([cid], function(err){
      if (err) {
        LogErr(err);
        return res.end('3');
      }
      return res.end();
    });
  });
});

module.exports = router;
