
var router = require('express').Router();
var Q = require('q');
var redis = require('redis');

var KEY = require('./key');
var IDs = require('../models/ids.js');
var Problem = require('../models/problem.js');
var Solution = require('../models/solution.js');
var User = require('../models/user.js');

var Logic = require('../logic');
var Comm = require('../comm');
var ERR = Comm.ERR;
var FailRender= Comm.FailRender;
var FailProcess = Comm.FailProcess;

router.get('/', function(req, res){
  var name = req.session.user ? req.session.user.name : '';
  var ret = ERR.SYS;
  Q.fcall(function(){
    if (name !== 'admin') {
      ret = ERR.ACCESS_DENIED;
      throw new Error('access denied.');
    }
    return Logic.GetRedis(redis.createClient(), "marquee_data");
  })
  .then(function(json){
    var marqueeList = [];
    if (json) {
      marqueeList = JSON.parse(json);
    }
    res.render('admin', {
      title: 'Admin',
      key: KEY.ADMIN,
      marqueeList: marqueeList
    });
  })
  .fail(function(err){
    FailRender(err, res, ret);
  })
  .done();
});

/*
 * 批量新建题目
 */
router.post('/batchcreateprob', function(req, res){
  var cnt = parseInt(req.body.cnt, 10);
  var manager = Comm.clearSpace(req.body.manager);
  var source = Comm.clearSpace(req.body.source);
  var resp = {ret: ERR.OK};
  var ret = ERR.SYS;
  Q.fcall(function(){
    var name = req.session.user ? req.session.user.name : '';
    if (name !== 'admin') {
      ret = ERR.ACCESS_DENIED;
      throw new Error('access denied.');
    }
    if (!manager || !source || !cnt || cnt > 50) {
      ret = ERR.ARGS;
      throw new Error('invalid args.');
    }
    return User.watch(manager);
  })
  .then(function(user){
    if (!user) {
      ret = ERR.NOT_EXIST;
      throw new Error('user('+manager+') NOT exist.');
    }
    return IDs.get('problemID', cnt);
  })
  .then(function(id){
    var problems = [];
    for (var i = id; i < id + cnt; ++i) {
      problems[i] = {
        problemID: i,
        manager: manager,
        source: source
      };
    }
    resp.id = id;
    return Problem.create(problems);
  })
  .then(function(err){
    req.session.msg = 'mission complete.';
    res.send(resp);
  })
  .fail(function(err){
    FailProcess(err, res, ret);
  })
  .done();
});

/*
 * 网站顶部跑马灯数据配置
 */
router.post('/setmarquee', function(req, res){
  var json = req.body.json;
  var ret = ERR.SYS;
  Q.fcall(function(){
    var name = req.session.user ? req.session.user.name : '';
    if (name !== 'admin') {
      ret = ERR.ACCESS_DENIED;
      throw new Error('access denied.');
    }
    return Logic.SetRedis(redis.createClient(), "marquee_data", json);
  })
  .then(function(){
    res.send({ret: ERR.OK, msg: "data has been saved successfully."});
  })
  .fail(function(err){
    FailProcess(err, res, ret);
  })
  .done();
});

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
