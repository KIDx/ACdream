/*
 * contest.type
 *  = 1: DIY Contest (all users can add)
 *  = 2: VIP Contest (only admin can add)
 */

var router = require('express').Router();
var async = require('async');
var xss = require('xss');
var Q = require('q');

var IDs = require('../models/ids.js');
var Contest = require('../models/contest.js');
var ContestRank = require('../models/contestrank.js');
var Overview = require('../models/overview.js');
var User = require('../models/user.js');
var Problem = require('../models/problem.js');
var Solution = require('../models/solution.js');
var Topic = require('../models/topic.js');
var Comment = require('../models/comment.js');

var KEY = require('./key');
var Settings = require('../settings');
var languages = Settings.languages;
var xss_options = Settings.xss_options;
var Comm = require('../comm');
var clearSpace = Comm.clearSpace;
var isRegCon = Comm.isRegCon;
var getDate = Comm.getDate;
var userCol = Comm.userCol;
var userTit = Comm.userTit;
var solCol = Comm.solCol;
var solRes = Comm.solRes;
var getRegState = Comm.getRegState;
var ERR = Comm.ERR;
var FailRender = Comm.FailRender;
var FailProcess = Comm.FailProcess;

/*
 * 注册比赛并且初始化该用户的ContestRank
 */
function regContestAndUpdate(cid, name) {
  return Contest.update(cid, {$addToSet: {contestants: name}})
  .then(function(){
    return ContestRank.findOne({'_id.cid': cid, '_id.name': name});
  })
  .then(function(user){
    if (!user) {
      return (new ContestRank(cid, name)).save();
    }
  });
}

/*
 * 一个比赛的页面
 */
router.get('/', function(req, res){
  var cid = parseInt(req.query.cid, 10);
  var name = req.session.user ? req.session.user.name : '';
  var Resp = {
    title: 'Contest '+cid,
    key: KEY.CONTEST,
    getDate: getDate,
    Col: solCol,
    Res: solRes,
    langs: languages
  };

  var ret = ERR.SYS;
  Q.fcall(function(){
    if (!cid) {
      ret = ERR.PAGE_NOT_FOUND;
      throw new Error('page not found');
    }
  })
  .then(function(){
    return Contest.watch(cid)
  })
  .then(function(contest) {
    if (!contest) {
      ret = ERR.PAGE_NOT_FOUND;
      throw new Error('page not found');
    }
    if (contest.type === 1 && contest.password &&
        name !== contest.userName && name !== 'admin' &&
        (!req.session.cid || !req.session.cid[cid])) {
      ret = ERR.ACCESS_DENIED;
      throw new Error('access denied');
    }
    Resp.contest = contest;
    Resp.reg_state = getRegState(contest, name);
    Resp.type = contest.type;
    Resp.family = contest.family;
    var pids = [];
    if (contest.probs) {
      contest.probs.forEach(function(p){
        pids.push(p[0]);
      });
    }
    return [Problem.find({problemID: {$in: pids}}), User.watch(contest.userName)];
  })
  .spread(function(problems, user){
    if (!user) {
      throw new Error('data error');
    }
    var Pt = {};
    if (problems) {
      problems.forEach(function(p){
        Pt[p.problemID] = p;
      });
    }
    Resp.Pt = Pt;
    Resp.MC = userCol(user.rating);
    Resp.MT = userTit(user.rating);
    return res.render('contest', Resp);
  })
  .fail(function(err){
    FailRender(err, res, ret);
  })
  .done();
});

/*
 * 比赛列表页面
 */
router.get('/list', function(req, res){
  var type = parseInt(req.query.type, 10);
  var family = clearSpace(req.query.family);
  var page = parseInt(req.query.page, 10);
  if (!page) {
    page = 1;
  }
  var cond = {type: type};
  var cond1 = {};
  var cond2 = {};
  var search = clearSpace(req.query.search);
  if (search) {
    cond1.title = cond2.userName = new RegExp("^.*"+Comm.toEscape(search)+".*$", 'i');
    cond.$or = [cond1, cond2];
  }
  if (type === 2 && family) {
    cond.family = family;
  }
  var resp = {
    title: 'ContestList',
    key: KEY.CONTEST_LIST,
    type: type,
    family: cond.family,
    getDate: getDate,
    search: search,
    page: page
  };

  var ret = ERR.SYS;
  Q.fcall(function(){
    if (!type || type < 1 || type > 2) {
      ret = ERR.PAGE_NOT_FOUND;
      throw new Error('page not found');
    }
    if (page < 0) {
      ret = ERR.REDIRECT;
      throw new Error('redirect');
    }
    return Contest.get(cond, page);
  })
  .then(function(o){
    var T = [], R = {}, now = (new Date()).getTime();
    var CS = {}, names = [];
    if (o.contests) {
      if (req.session.cid) {
        CS = req.session.cid;
      }
      o.contests.forEach(function(p, i){
        names.push(p.userName);
        T.push(p.startTime-now);
        R[i] = req.session.user && isRegCon(p.contestants, req.session.user.name);
      });
    }
    resp.contests = o.contests;
    resp.totalPage = o.totalPage;
    resp.T = T;
    resp.R = R;
    resp.CS = CS;
    return User.find({name: {$in: names}});
  })
  .then(function(users){
    var UC = {}, UT = {};
    if (users) {
      users.forEach(function(p){
        UC[p.name] = userCol(p.rating);
        UT[p.name] = userTit(p.rating);
      });
    }
    resp.UC = UC;
    resp.UT = UT;
    return res.render('contestlist', resp);
  })
  .fail(function(err){
    if (ret === ERR.REDIRECT) {
      return res.redirect('/contest/list?type='+type + (cond.family ? "&family="+cond.family : ""));
    }
    FailRender(err, res, ret);
  })
  .done();
});

/*
 * 比赛的overview页的AC/submit数以及当前用户AC状态的聚合
 */
router.post('/overview', function(req, res){
  var cid = parseInt(req.body.cid, 10);
  var resp = {
    ret: ERR.OK,
    stat: {},
    self: {}
  };

  var now = (new Date()).getTime();
  var sol = null;
  var overviewRunID = 0;
  var promiseReduceAndGetOverview = Contest.findOneAndUpdate({
    contestID: cid,
    overviewUpdateTime: {$lt: now - 30000}    //距离上次聚合>=30秒, 聚合一次Overview
  }, {
    $set: {overviewUpdateTime: now}
  }, {
    new: false
  })
  .then(function(contest){
    if (contest) {
      overviewRunID = contest.overviewRunID;
      return Solution.findOneBySort({cID: cid, runID: {$gt: overviewRunID}}, {runID: -1});
    }
  })
  .then(function(tmpSol){
    if (tmpSol) {
      sol = tmpSol;
      return Solution.findOneBySort({cID: cid, result: {$lt: 2}}, {runID: 1});
    }
  })
  .then(function(sol2){
    if (sol) {
      var maxRunID;
      if (sol2 && sol.runID > sol2.runID - 1) {
        maxRunID = sol2.runID - 1;
      } else {
        maxRunID = sol.runID;
      }
      return Solution.mapReduce({
        query: {userName: {$ne: 'admin'}, cID: cid, runID: {$gt: overviewRunID, $lte: maxRunID}},
        map: function(){
          return emit({
            cid: this.cID,
            pid: this.problemID,
            result: this.result === 2
          }, 1);
        },
        reduce: function(key, vals){
          var val = 0;
          vals.forEach(function(p){
            val += p;
          });
          return val;
        },
        out: {reduce: 'overviews'}
      })
      .then(function(){
        return Contest.update(cid, {$set: {overviewRunID: maxRunID}});
      });
    }
  })
  .then(function(){
    return Overview.find({'_id.cid': cid});
  })
  .then(function(objs){
    objs.forEach(function(p){
      if (!resp.stat[p._id.pid]) {
        resp.stat[p._id.pid] = {};
        resp.stat[p._id.pid].ac = resp.stat[p._id.pid].all = 0;
      }
      if (p._id.result === true) {
        resp.stat[p._id.pid].ac += p.value;
      }
      resp.stat[p._id.pid].all += p.value;
    });
  });
  
  var promiseReduceUserRes = null
  if (req.session.user) {
    promiseReduceUserRes = Solution.aggregate([
      { $match: { userName: req.session.user.name, cID: cid, result: {$gt: 1} } },
      { $group: { _id: '$problemID', result: {$min: '$result'} } }
    ])
    .then(function(res){
      res.forEach(function(p){
        resp.self[p._id] = (p.result === 2);
      });
    });
  }

  var ret = ERR.SYS;
  Q.fcall(function(){
    if (!cid) {
      ret = ERR.ARGS;
      throw new Error('cid can NOT be empty');
    }
    return [promiseReduceAndGetOverview, promiseReduceUserRes];
  })
  .spread(function(){
    return res.json(resp);
  })
  .fail(function(err){
    FailProcess(err, res, ret);
  })
  .done();
});

/*
 * 比赛排名的聚合
 */
router.post('/ranklist', function(req, res){
  var cid = parseInt(req.body.cid, 10);
  var page = parseInt(req.body.page, 10);
  if (!page) {
    page = 1;
  }

  var now = (new Date()).getTime();
  var resp = {
    ret: ERR.OK,
    svrTime: now
  };
  var getBeforeCount = function(cid, stars, name, val, callback){
    return ContestRank.count({
      '_id.cid': cid,
      '_id.name': {$nin: stars},
      $or: [
        {'value.solved': {$gt: val.solved}},
        {'value.solved': val.solved, 'value.penalty': {$lt: val.penalty}},
        {'value.solved': val.solved, 'value.penalty': val.penalty, 'value.submitTime': {$gt: val.submitTime}},
        {'value.solved': val.solved, 'value.penalty': val.penalty, 'value.submitTime': val.submitTime, '_id.name': {$lt: name}}
      ]
    });
  };
  var getContestRank = function(con){
    var currentUser = req.session.user ? req.session.user.name : '';
    resp.reg_state = getRegState(con, currentUser);
    resp.fb = con.FB;
    resp.contestants = con.contestants.length;
    resp.duration = con.len * 60;
    resp.startTime = con.startTime;
    return ContestRank.get({'_id.cid': cid}, page)
    .then(function(o){
      resp.pageNum = o.totalPage;
      if (!o.users || o.users.length == 0) {
        return ;
      }
      var has = {};
      var names = [];
      if (con.stars) {
        con.stars.forEach(function(p){
          has[p] = true;
        });
      }
      var hasMe = false;
      resp.users = [];
      o.users.forEach(function(p, i){
        var tmp = {name: p._id.name, value: p.value};
        if (has[tmp.name]) {
          tmp.star = true;
        }
        resp.users.push(tmp);
        names.push(tmp.name);
        if (!hasMe && currentUser === tmp.name) {
          hasMe = true;
        }
      });
      var promise = null;
      if (currentUser && !hasMe) {
        names.push(currentUser);
        promise = ContestRank.findOne({'_id.cid': cid, '_id.name': currentUser}); 
      }
      return Q.all([
        getBeforeCount(cid, con.stars, o.users[0].name, o.users[0].value),
        User.find({name: {$in: names}}),
        ContestRank.count({'_id.cid': cid, 'value.submitTime': {$gt: 0}}),
        promise
      ])
      .spread(function(cnt, users, total, user){
        resp.rank = cnt + 1;
        resp.ratings = {};
        resp.I = {};
        users.forEach(function(p){
          resp.ratings[p.name] = p.rating;
          resp.I[p.name] = p.nick;
        });
        resp.total = total;
        if (user) {
          return getBeforeCount(cid, con.stars, user._id.name, user.value)
          .then(function(cnt){
            var rank = cnt + 1;
            var tp = {name: user._id.name, value: user.value, rank: rank};
            if (rank <= resp.rank) {
              resp.users.unshift(tp);
            } else {
              resp.users.push(tp);
            }
          });
        }
      });
    });
  };

  var ret = ERR.SYS;
  Q.fcall(function(){
    if (!cid || page < 0) {
      ret = ERR.ARGS;
      throw new Error('invalid args');
    }
    return Contest.findOneAndUpdate({
      contestID: cid,
      updateTime: { $lt: now - 30000 }    //距离上次聚合>=30秒, 聚合一次排名
    }, {
      $set: { updateTime: now }
    }, {
      new: false
    })
  })
  .then(function(contest){
    if (!contest) {
      return Contest.watch(cid)
      .then(function(con){
        if (!con) {
          ret = ERR.ARGS;
          throw new Error('invalid cid');
        }
        return getContestRank(con);
      });
    } else {
      var indate = {$gte: contest.startTime, $lte: contest.startTime+contest.len*60000};
      var cond = {
        cID: cid,
        userName: {$ne: 'admin'},
        inDate: indate,
        runID: {$gt: contest.maxRunID}
      };
      return Solution.findOneBySort(cond, {runID: -1})
      .then(function(doc){
        if (!doc) {
          return getContestRank(contest);
        }
        return Solution.findOneBySort({$and: [cond, {result: {$lt: 2}}]}, {runID: 1})
        .then(function(sol){
          var maxRunID;
          if (sol) {
            maxRunID = sol.runID - 1;
          } else {
            maxRunID = doc.runID;
          }
          return [
            Solution.mapReduce({
              query: {$and: [cond, {runID: {$lte: maxRunID}}]},
              sort: {runID: -1},
              map: function(){
                var val = { solved: 0, penalty: 0, status: {}, submitTime: this.inDate };
                if (this.result == 2) {
                  val.solved = 1;
                  val.penalty = this.inDate;
                  val.status[this.problemID] = {wa: 0, inDate: val.penalty};
                } else {
                  val.status[this.problemID] = {wa: -1};
                }
                return emit({cid: this.cID, name: this.userName}, val);
              },
              reduce: function(key, vals){
                var val = { solved: 0, penalty: 0, status: {}, submitTime: vals.length ? vals[0].submitTime : 0 };
                for (var j = vals.length-1; j >= 0; j--) {
                  p = vals[j];
                  if (p.status) {
                    for (var i in p.status) {
                      var o = p.status[i];
                      if (!val.status[i]) {
                        if (o.wa >= 0) {
                          val.solved++;
                          val.penalty += o.wa*penalty*60000 + o.inDate;
                        }
                        val.status[i] = o;
                      } else if (val.status[i].wa < 0) {
                        if (o.wa >= 0) {
                          val.solved++;
                          val.status[i].wa = o.wa - val.status[i].wa;
                          val.status[i].inDate = o.inDate;
                          val.penalty += val.status[i].wa*penalty*60000 + o.inDate;
                        } else {
                          val.status[i].wa += o.wa;
                        }
                      }
                    }
                  }
                }
                return val;
              },
              scope: { penalty : contest.penalty },
              out: { reduce : 'ranks' }
            }),
            Solution.aggregate([
              { $match: {cID: cid, userName: {$ne: 'admin'}, inDate: indate, result: 2} },
              { $sort: {runID: 1} },
              { $group: { _id: '$problemID', userName: {$first: '$userName'} } }
            ])
            .then(function(results){
              var FB = {};
              results.forEach(function(p){
                FB[p._id] = p.userName;
              });
              return Contest.findOneAndUpdate({contestID: cid}, {$set: {FB: FB, maxRunID: maxRunID}}, {new: true});
            })
            .then(function(con){
              contest = con; //update contest because of the FB
            })
          ];
        })
        .spread(function(){
          return getContestRank(contest);
        });
      });
    }
  })
  .then(function(){
    res.send(resp);
  })
  .fail(function(err){
    FailProcess(err, res, ret);
  })
  .done();
});

/*
 * 在一个比赛中发帖
 */
router.post('/addDiscuss', function(req, res){
  var title = clearSpace(req.body.title);
  var content = clearSpace(req.body.content);
  var cid = parseInt(req.body.cid, 10);
  var name;

  var ret = ERR.SYS;
  Q.fcall(function(){
    if (!title || !content || !cid) {
      ret = ERR.ARGS;
      throw new Error('invalid args');
    }
    if (!req.session.user) {
      ret = ERR.INVALID_SESSION;
      throw new Error('invalid session');
    }
    name = req.session.user.name;
    return Contest.watch(cid);
  })
  .then(function(contest){
    if (contest.type === 2 && name != contest.userName && !isRegCon(contest.contestants, name)) {
      ret = ERR.ARGS;
      throw new Error('you are NOT contestant of this contest.');
    }
    return IDs.get('topicID');
  })
  .then(function(id){
    return (new Topic({
      id: id,
      title: title,
      content: xss(content, xss_options),
      cid: cid,
      user: name,
      inDate: (new Date()).getTime()
    })).save();
  })
  .then(function(){
    return res.send({ret: ERR.OK});
  })
  .fail(function(err){
    FailProcess(err, res, ret);
  })
  .done();
});

/*
 * 显示一个比赛的所有帖子
 */
router.post('/discuss', function(req, res){
  var cid = parseInt(req.body.cid, 10);
  var page = parseInt(req.body.page, 10);
  if (!page) {
    page = 1;
  }
  var resp = {ret: ERR.OK};
  var ret = ERR.SYS;
  Q.fcall(function(){
    if (!cid || page < 0) {
      ret = ERR.ARGS;
      throw new Error('invalid args');
    }
    return Contest.watch(cid);
  })
  .then(function(contest){
    if (!contest) {
      ret = ERR.ARGS;
      throw new Error('contest NOT found');
    }
    return Topic.get({cid: cid}, page);
  })
  .then(function(o){
    var names = [], has = {}, tps = [];
    o.topics.forEach(function(p){
      if (!has[p.user]) {
        names.push(p.user);
        has[p.user] = true;
      }
      if (p.lastReviewer && !has[p.lastReviewer]) {
        names.push(p.lastReviewer);
        has[p.lastReviewer] = true;
      }
      tps.push({
        id: p.id,
        title: p.title,
        user: p.user,
        reviewsQty: p.reviewsQty,
        browseQty: p.browseQty,
        lastReviewer: p.lastReviewer,
        lastReviewTime: Comm.getTime(p.lastReviewTime),
        lastComment: p.lastComment
      });
    });
    resp.topics = tps;
    resp.totalPage = o.totalPage;
    return User.find({name: {$in: names}});
  })
  .then(function(users){
    var I = {};
    users.forEach(function(p){
      I[p.name] = p.imgType;
    });
    resp.imgFormat = I;
    return res.json(resp);
  })
  .fail(function(err){
    FailProcess(err, res, ret);
  })
  .done();
});

/*
 * 密码登录私有比赛(DIY Contest)
 */
router.post('/login', function(req, res){
  var psw = String(req.body.psw);
  var cid = parseInt(req.body.cid, 10);
  var ret = ERR.SYS;
  Q.fcall(function(){
    if (!req.body.psw || !psw || !cid) {
      ret = ERR.ARGS;
      throw new Error('invalid args');
    }
    return Contest.watch(cid);
  })
  .then(function(contest){
    if (!contest) {
      ret = ERR.ARGS;
      throw new Error('contest NOT exist.');
    }
    if (Comm.MD5(psw) !== contest.password) {
      ret = ERR.WRONG_PASSWORD;
      throw new Error('the password is not correct.');
    }
    if (!req.session.cid) {
      req.session.cid = {};
    }
    req.session.cid[req.body.cid] = true;
    res.send({ret: ERR.OK});
  })
  .fail(function(err){
    FailProcess(err, res, ret);
  })
  .done();
});

/*
 * 删除一个比赛
 */
router.post('/del', function(req, res){
  var cid = parseInt(req.body.cid, 10);
  var name = req.session.user ? req.session.user.name : '';
  var ret = ERR.SYS;
  Q.fcall(function(){
    if (!cid || !name) {
      ret = ERR.ARGS;
      throw new Error('invalid args');
    }
    return Contest.watch(cid);
  })
  .then(function(contest){
    if (name !== contest.userName && name !== 'admin') {
      ret = ERR.ACCESS_DENIED;
      throw new Error('access denied.');
    }
    return Solution.findOne({cID: cid});
  })
  .then(function(sol){
    if (sol) {
      ret = ERR.ARGS;
      throw new Error('can NOT delete because the contest HAS submissions.');
    }
    return Contest.remove(cid);
  })
  .then(function(){
    req.session.msg = 'Contest '+cid+' has been Deleted successfully!';
    res.send({ret: ERR.OK});
  })
  .fail(function(err){
    FailProcess(err, res, ret);
  })
  .done();
});

/*
 * 注册一个比赛(contest.type = 2)
 */
router.post('/register', function(req, res){
  var cid = parseInt(req.body.cid, 10);
  var name = req.session.user ? req.session.user.name : '';
  var ret = ERR.SYS;
  Q.fcall(function(){
    if (!cid || !name) {
      ret = ERR.ARGS;
      throw new Error('invalid args');
    }
    if (name === 'admin') {
      ret = ERR.ARGS;
      throw new Error('admin NO need to register.');
    }
    return Contest.watch(cid);
  })
  .then(function(contest){
    if (!contest || contest.type !== 2) {
      ret = ERR.ARGS;
      throw new Error('invalid args');
    }
    if (getRegState(contest, name) === 2) {
      ret = ERR.ARGS;
      throw new Error('registration closed.');
    }
    return regContestAndUpdate(cid, name);
  })
  .then(function(){
    req.session.msg = 'Your Registeration has been submited successfully!';
    res.send({ret: ERR.OK});
  })
  .fail(function(err){
    FailProcess(err, res, ret);
  })
  .done();
});

/*
 * 添加一个用户到参赛者(contest.type = 2)
 */
router.post('/addContestant', function(req, res){
  var name = clearSpace(req.body.name);
  var cid = parseInt(req.body.cid, 10);
  var ret = ERR.SYS;
  Q.fcall(function(){
    if (!req.session.user || req.session.user.name !== 'admin') {
      ret = ERR.ACCESS_DENIED;
      throw new Error('access denied');
    }
    if (!cid || !name) {
      ret = ERR.ARGS;
      throw new Error('invalid args');
    }
    return Contest.watch(cid);
  })
  .then(function(contest){
    if (!contest || contest.type !== 2) {
      ret = ERR.ARGS;
      throw new Error('invalid contest');
    }
    if (contest.contestants.indexOf(name) >= 0) {
      ret = ERR.OK;
      throw new Error('the user is already contestant of this contest.');
    }
    return User.watch(name);
  })
  .then(function(user){
    if (!user) {
      ret = ERR.USER_NOT_EXIT;
      throw new Error('the user is not exist.');
    }
    return regContestAndUpdate(cid, name);
  })
  .then(function(){
    return res.send({ret: ERR.OK, msg: 'add user to contest successfully.'});
  })
  .fail(function(err){
    FailProcess(err, res, ret);
  });
});

/*
 * 移除一个参赛者
 */
router.post('/removeContestant', function(req, res){
  var name = clearSpace(req.body.name);
  var cid = parseInt(req.body.cid, 10);
  var ret = ERR.SYS;
  Q.fcall(function(){
    if (!req.session.user || req.session.user.name !== 'admin') {
      ret = ERR.ACCESS_DENIED;
      throw new Error('access denied');
    }
    if (!cid || !name) {
      ret = ERR.ARGS;
      throw new Error('invalid args');
    }
    return Solution.findOne({userName: name, cID: cid})
  })
  .then(function(sol){
    if (sol) {
      ret = ERR.ARGS;
      throw new Error('he has submissions for the contest, can NOT be removed.');
    }
    return Contest.update(cid, {$pull: {contestants: name}});
  })
  .then(function(){
    return ContestRank.remove({'_id.cid': cid, '_id.name': name});
  })
  .then(function(){
    res.send({ret: ERR.OK, msg: 'the user has been removed successfully.'});
  })
  .fail(function(err){
    FailProcess(err, res, ret);
  })
  .done();
});

/*
 * 切换打星状态
 */
router.post('/toggleStar', function(req, res){
  var cid = parseInt(req.body.cid, 10);
  var str = clearSpace(req.body.str);
  var type = parseInt(req.body.type, 10);
  var ret = ERR.SYS;
  Q.fcall(function(){
    if (!cid || !str || !type) {
      ret = ERR.ARGS;
      throw new Error('invalid args');
    }
    if (!req.session.user) {
      ret = ERR.INVALID_SESSION;
      throw new Error('invalid session');
    }
    return Contest.watch(cid);
  })
  .then(function(contest){
    if (!contest) {
      ret = ERR.ARGS;
      throw new Error('contest NOT exist');
    }
    var name = req.session.user.name;
    if (name !== contest.userName && name !== 'admin') {
      ret = ERR.ACCESS_DENIED;
      throw new Error('access denied');
    }
    var has = {};
    var names = [];
    str.split(' ').forEach(function(p){
      names.push(p);
    });
    return User.distinct('name', {name: {$in: names}});
  })
  .then(function(users){
    var val;
    if (type === 1) {
      val = {$addToSet: {stars: {$each: users}}};
    } else {
      val = {$pullAll: {stars: users}};
    }
    return Contest.update(cid, val);
  })
  .then(function(){
    res.send({ret: ERR.OK, msg: 'mission complete.'});
  })
  .fail(function(err){
    FailProcess(err, res, ret);
  })
  .done();
});

/*
 * 当contest处于pending状态时，需要每隔一段时间获取最新的contest.startTime, contest.len, svrTime
 */
router.post('/syncTime', function(req, res){
  var cid = parseInt(req.body.cid, 10);
  var name = req.session.user ? req.session.user.name : '';
  Q.fcall(function(){
    if (!cid) {
      ret = ERR.ARGS;
      throw new Error('invalid args');
    }
    return Contest.watch(cid);
  })
  .then(function(contest){
    if (!contest) {
      ret = ERR.ARGS;
      throw new Error('contest NOT exist');
    }
    res.send({
      ret: ERR.OK,
      startTime: contest.startTime,
      reg_state: getRegState(contest, name),
      contestants: contest.contestants.length,
      duration: contest.len * 60,
      svrTime: (new Date()).getTime()
    });
  })
  .fail(function(err){
    FailProcess(err, res, ret);
  })
  .done();
});

module.exports = router;
