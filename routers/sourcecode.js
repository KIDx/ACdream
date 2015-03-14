
var router = require('express').Router();
var Q = require('q');

var Solution = require('../models/solution.js');
var Problem = require('../models/problem.js');
var Contest = require('../models/contest.js');

var KEY = require('./key');
var Comm = require('../comm');
var LogErr = Comm.LogErr;
var ERR = Comm.ERR;
var FailRender = Comm.FailRender;

/*
 * 查看源代码的页面
 */
router.get('/:rid', function(req, res){
  var rid = parseInt(req.params.rid, 10);
  var ret = ERR.SYS;
  Q.fcall(function(){
    if (!rid) {
      ret = ERR.PAGE_NOT_FOUND;
      throw new Error('page not found');
    }
  })
  .then(function(){
    return Solution.findOne({runID: rid});
  })
  .then(function(sol) {
    if (!sol) {
      ret = ERR.PAGE_NOT_FOUND;
      throw new Error('page not found');
    }
    var RP = function(flg){
      res.render('sourcecode', {
        title: 'Sourcecode',
        key: KEY.SOURCE_CODE,
        solution: sol,
        getDate: Comm.getDate,
        flg: flg,
        Res: Comm.solRes
      });
    };
    if (!req.session.user) {
      return RP(false);
    }
    var name = req.session.user.name;
    if (name == sol.userName || name == 'admin') {
      return RP(true);
    }
    Problem.watch(sol.problemID)
    .then(function(prob){
      if (!prob) {
        ret = ERR.PAGE_NOT_FOUND;
        throw new Error('page not found');
      }
      if (name == prob.manager) {
        return RP(true);
      }
      if (sol.cID < 0) {
        return RP(false);
      }
      Contest.watch(sol.cID)
      .then(function(contest){
        return RP(contest && name == contest.userName);
      })
      .fail(function(err){
        FailRender(err, res, ret);
      });
    })
    .fail(function(err){
      FailRender(err, res, ret);
    });
  })
  .fail(function(err){
    FailRender(err, res, ret);
  });
});

module.exports = router;
