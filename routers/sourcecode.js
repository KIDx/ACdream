
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
  var name = req.session.user ? req.session.user.name : '';
  var rid = parseInt(req.params.rid, 10);
  var resp = {
    title: 'Sourcecode',
    key: KEY.SOURCE_CODE,
    getDate: Comm.getDate,
    Res: Comm.solRes
  };
  var ret = ERR.SYS;
  Q.fcall(function(){
    if (!rid) {
      ret = ERR.PAGE_NOT_FOUND;
      throw new Error('page not found.');
    }
    if (!name) {
      ret = ERR.ACCESS_DENIED;
      throw new Error('access denied.');
    }
    return Solution.findOne({runID: rid});
  })
  .then(function(sol) {
    if (!sol) {
      ret = ERR.PAGE_NOT_FOUND;
      throw new Error('page not found.');
    }
    resp.solution = sol;
    return [
      Problem.watch(sol.problemID),
      sol.cID > 0 ? Contest.watch(sol.cID) : null
    ];
  })
  .spread(function(problem, contest){
    if (!problem) {
      throw new Error('data error.');
    }
    if (name !== resp.solution.userName && name !== 'admin' && name !== problem.manager &&
        (!contest || name !== contest.userName)) {
      ret = ERR.ACCESS_DENIED;
      throw new Error('access denied.');
    }
    res.render('sourcecode', resp);
  })
  .fail(function(err){
    FailRender(err, res, ret);
  })
  .done();
});

module.exports = router;
