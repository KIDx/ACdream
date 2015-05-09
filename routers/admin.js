
var router = require('express').Router();
var Q = require('q');

var Solution = require('../models/solution.js');
var User = require('../models/user.js');
var Comm = require('../comm');
var ERR = Comm.ERR;
var FailProcess = Comm.FailProcess;

/*
 * 重新统计用户AC数和submit数
 */
router.post('/stat', function(req, res){
  Q.fcall(function(){
    var name = req.session.user ? req.session.user.name : '';
    if (name !== 'admin') {
      ret = ERR.ACCESS_DENIED;
      throw new Error('access denied.');
    }
    return Solution.mapReduce({
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
    });
  })
  .then(function(result){
    var promiseList = [];
    result.forEach(function(p){
      promiseList.push(User.update({name: p._id}, {$set: p.value}));
    });
    return promiseList;
  })
  .spread(function(){
    req.session.msg = 'mission complete.';
    return res.send({ret: ERR.OK});
  })
  .fail(function(err){
    FailProcess(err, res, ret);
  })
  .done();
});

module.exports = router;
