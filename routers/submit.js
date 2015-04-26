
var router = require('express').Router();
var Q = require('q');

var IDs = require('../models/ids.js');
var Solution = require('../models/solution.js');
var Problem = require('../models/problem.js');
var Contest = require('../models/contest.js');
var User = require('../models/user.js');

var KEY = require('./key');
var Settings = require('../settings');
var Comm = require('../comm');
var ERR = Comm.ERR;
var FailProcess = Comm.FailProcess;

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
    langs: Settings.languages
  });
})
.post(function(req, res) {
  var name = req.session.user ? req.session.user.name : '';
  var now = (new Date()).getTime();
  var cid = parseInt(req.body.cid, 10);
  var pid = parseInt(req.body.pid, 10);
  var Str = String(req.body.code);
  var lang = parseInt(req.body.lang, 10);
  Q.fcall(function(){
    if (!name) {
      ret = ERR.INVALID_SESSION;
      throw new Error('invalid session.');
    }
    if (!pid || !Str || Str.length < 50 || Str.length > 65536 ||
        !lang || lang < 1 || lang >= Settings.languages.length) {
      ret = ERR.ARGS;
      throw new Error('invalid args.');
    }
    if (!cid) {
      cid = -1;
    }
    return [
      Problem.watch(pid),
      Contest.watch(cid)
    ];
  })
  .spread(function(problem, contest){
    if (!problem) {
      ret = ERR.NOT_EXIST;
      throw new Error('problem NOT exist.');
    }
    if (cid !== -1 && !contest) {
      ret = ERR.NOT_EXIST;
      throw new Error('contest NOT exist.');
    }
    if (contest) {
      if (contest.type == 2) {
        if (now > contest.startTime+contest.len*60000) {
          ret = ERR.WARNNING;
          throw new Error('contest already ended.');
        }
        if (name != contest.userName && !Comm.isRegCon(contest, name)) {
          ret = ERR.ACCESS_DENIED;
          throw new Error('access denied.');
        }
      }
      var bIsProbInContest = false;
      for (var i = 0; i < contest.probs.length; i++) {
        if (pid === contest.probs[i][0]) {
          bIsProbInContest = true;
        }
      }
      if (!bIsProbInContest) {
        ret = ERR.NOT_EXIST;
        throw new Error('problem NOT exist.');
      }
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
        length: Str.length,
        cID: cid,
        code: Str
      })).save(),
      Problem.update(pid, {$inc: {submit: 1}}),
      User.update({name: name}, {$inc: {submit: 1}})
    ];
  })
  .spread(function(){
    var msg = 'submit successfully.';
    if (cid === -1) {
      req.session.msg = msg;
    }
    return res.send({ret: ERR.OK, msg: msg});
  })
  .fail(function(err){
    FailProcess(err, res, ret);
  })
  .done();
});

module.exports = router;
