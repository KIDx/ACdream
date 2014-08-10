
var router = require('express').Router();
var async = require('async');

var Solution = require('../models/solution.js');
var User = require('../models/user.js');
var Comm = require('../comm');
var LogErr = Comm.LogErr;

/*
 * 重新统计用户AC数和submit数
 */
router.post('/stat', function(req, res){
  res.header('Content-Type', 'text/plain');
  if (!req.session.user) {
    req.session.msg = 'Please login first!';
    return res.end();
  }
  if (req.session.user.name != 'admin') {
    req.session.msg = 'Failed! You have no permission to Add or Edit problem.';
    return res.end();
  }
  Solution.mapReduce({
    map: function() {
      emit(this.userName, {pids: null, submit: 1, pid: this.problemID, result: this.result});
    },
    reduce: function(k, vals) {
      var val = {submit: 0};
      val.pids = new Array();
      vals.forEach(function(p){
        val.submit += p.submit;
        if (p.pids) {
          p.pids.forEach(function(i){
            val.pids.push(i);
          });
        } else if (p.result == 2) {
          val.pids.push(p.pid);
        }
      });
      return val;
    },
    finalize: function(key, val) {
      if (!val.pids) {
        if (val.result == 2) {
          return {solved: 1, submit: 1};
        } else {
          return {solved: 0, submit: 1};
        }
      } else {
        var has = {}, solved = 0;
        val.pids.forEach(function(p){
          if (!has[p]) {
            has[p] = true;
            ++solved;
          }
        });
        return {solved: solved, submit: val.submit};
      }
    },
    sort: {runID: -1}
  }, function(err, U){
    if (err) {
      LogErr(err);
      req.session.msg = '系统错误！';
      return res.end();
    }
    if (!U) {
      return res.end();
    }
    async.each(U, function(p, cb){
      User.update({name: p._id}, {$set: p.value}, cb);
    }, function(err){
      if (err) {
        LogErr(err);
        req.session.msg = '系统错误！';
        return res.end();
      }
      req.session.msg = '统计完成！';
      return res.end();
    });
  });
});

module.exports = router;
