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
var LogErr = Comm.LogErr;
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
      (new ContestRank(cid, name)).save();
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
      return Solution.findOneBySort({cID: cid, runID: {$gt: contest.overviewRunID}}, {runID: -1});
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
        query: {userName: {$ne: 'admin'}, cID: cid, runID: {$gt: contest.overviewRunID, $lte: maxRunID}},
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
  });
});

/*
 * 在一个比赛中发帖
 */
router.post('/addDiscuss', function(req, res){
  res.header('Content-Type', 'text/plain');
  if (!req.session.user) {
    req.session.msg = '请先登录！';
    return res.end('1');    //refresh
  }
  var title = clearSpace(req.body.title);
  var content = clearSpace(req.body.content);
  var name = req.session.user.name;
  var cid = parseInt(req.body.cid, 10);
  if (!title || !content || !name || ! cid) {
    return res.end();    //not allow
  }
  Contest.watch(cid)
  .then(function(con){
    if (con.type == 2 && name != con.userName && !isRegCon(con.contestants, name)) {
      throw new Error('2');
    }
    return IDs.get('topicID')
  })
  .then(function(id){
    return (new Topic({
      id: id,
      title: title,
      content: xss(content, xss_options),
      cid: cid,
      user: req.session.user.name,
      inDate: (new Date()).getTime()
    })).save();
  })
  .then(function(){
    return res.end();
  })
  .fail(function(err){
    if (err.message === '2') {
      return res.end('2');
    }
    LogErr(err);
    return res.end('3');
  });
});

/*
 * 显示一个比赛的所有帖子
 */
router.post('/discuss', function(req, res){
  res.header('Content-Type', 'text/plain');
  var cid = parseInt(req.body.cid, 10);
  if (!cid) {
    return res.end();   //not allow
  }
  var page;
  if (!req.body.page) {
    page = 1;
  } else {
    page = parseInt(req.body.page, 10);
  }
  if (!page || page < 0) {
    return res.end();  //not allow
  }
  Contest.watch(cid)
  .then(function(contest){
    if (!contest) {
      return res.end();  //not allow
    }
    Response = {};
    Topic.get({cid: cid}, page)
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
      Response.topics = tps;
      Response.totalPage = o.totalPage;
      return User.find({name: {$in: names}});
    })
    .then(function(users){
      var I = {};
      users.forEach(function(p){
        I[p.name] = p.imgType;
      });
      Response.imgFormat = I;
      return res.json(Response);
    })
    .fail(function(err){
      LogErr(err);
      return res.end();
    });
  })
  .fail(function(err){
    LogErr(err);
    return res.end();  //not refresh
  });
});

/*
 * 密码登录私有比赛(DIY Contest)
 */
router.post('/login', function(req, res){
  res.header('Content-Type', 'text/plain');
  if (!req.body.psw) {
    return res.end();  //not allow
  }
  var cid = parseInt(req.body.cid, 10);
  if(!cid) {
    return res.end();  //not allow
  }
  Contest.watch(cid)
  .then(function(contest){
    if (Comm.MD5(String(req.body.psw)) == contest.password) {
      if (!req.session.cid) req.session.cid = {};
      req.session.cid[req.body.cid] = true;
      return res.end('1');
    }
    return res.end();
  })
  .fail(function(err){
    LogErr(err);
    return res.end();
  });
});

/*
 * 删除一个比赛
 */
router.post('/del', function(req, res){
  res.header('Content-Type', 'text/plain');
  if (!req.session.user) {
    return res.end();  //not allow
  }
  var cid = parseInt(req.body.cid, 10);
  var name = req.session.user.name;
  if (!cid || !name) {
    return res.end();  //not allow
  }
  Contest.watch(cid)
  .then(function(con){
    if (name != con.userName && name != 'admin') {
      req.session.msg = 'Delete Failed! You are not the manager!';
      return res.end();
    }
    Solution.findOne({cID: cid})
    .then(function(sol){
      if (sol) {
        req.session.msg = 'Can\'t delete the contest, because there are some submits in this contest!';
        return res.end();
      }
      Contest.remove(cid)
      .then(function(){
        req.session.msg = 'Contest '+cid+' has been Deleted successfully!';
        return res.end();
      })
      .fail(function(err){
        LogErr(err);
        req.session.msg = '系统错误！';
        return res.end();
      });
    })
    .fail(function(err){
      LogErr(err);
      req.session.msg = '系统错误！';
      return res.end();
    });
  })
  .fail(function(err){
    LogErr(err);
    req.session.msg = '系统错误！';
    return res.end();
  });
});

/*
 * 注册一个比赛(contest.type = 2)
 */
router.post('/register', function(req, res){
  res.header('Content-Type', 'text/plain');
  if (!req.session.user) {
    req.session.msg = 'Please login first!';
    return res.end();
  }
  var name = req.session.user.name;
  if (name === 'admin') {
    return res.end('1');
  }
  var cid = parseInt(req.body.cid, 10);
  Contest.watch(cid)
  .then(function(contest){
    if (!contest || contest.type != 2 || contest.password) {
      return res.end();  //not allow
    }
    if (getRegState(contest, name) === 2) {
      return res.end('3');
    }
    regContestAndUpdate(cid, name)
    .then(function(){
      req.session.msg = 'Your Registeration has been submited successfully!';
      return res.end();
    })
    .fail(function(err){
      LogErr(err);
      return res.end('2');
    });
  })
  .fail(function(err){
    LogErr(err);
    return res.end('2');
  });
});

/*
 * 添加一个用户到参赛者
 */
router.post('/addContestant', function(req, res){
  res.header('Content-Type', 'text/plain');
  if (!req.session.user) {
    req.session.msg = 'Please login first!';
    return res.end();
  }
  if (req.session.user.name != 'admin') {
    return res.end(); //not allow
  }
  var name = clearSpace(req.body.name);
  var cid = parseInt(req.body.cid, 10);
  var fa = parseInt(req.body.fa, 10);
  var tid = parseInt(req.body.tid, 10);
  if (!cid || !name || !fa || !tid) {
    return res.end(); //not allow
  }
  Contest.watch(cid)
  .then(function(contest){
    if (!contest) {
      return res.end(); //not allow
    }
    return User.watch(name);
  })
  .then(function(user){
    if (!user) {
      return res.end(); //not allow
    }
    if (contest.contestants.indexOf(user.name) >= 0) {
      return res.end('1');
    }
    return regContestAndUpdate(cid, name);
  })
  .then(function(){
    return IDs.get('topicID');
  })
  .then(function(id){
    return [
      (new Comment({
        id: id,
        content: '添加完成~',
        user: 'admin',
        tid: tid,
        fa: fa,
        at: name,
        inDate: (new Date()).getTime()
      })).save(),
      Topic.update(tid, {$inc: {reviewsQty: 1}})
    ];
  })
  .then(function(){
    req.session.msg = '添加完成！';
    return res.end();
  })
  .fail(function(err){
    LogErr(err);
    return res.end('3');
  });
});

/*
 * 移除一个参赛者
 */
router.post('/removeContestant', function(req, res){
  res.header('Content-Type', 'text/plain');
  if (!req.session.user) {
    req.session.msg = 'Please login first!';
    return res.end();
  }
  if (req.session.user.name != 'admin') {
    req.session.msg = 'You have no permission to do that!';
    return res.end();
  }
  var name = clearSpace(req.body.name);
  if (!name) {
    return res.end();  //not allow
  }
  var cid = parseInt(req.body.cid, 10);
  if (!cid) {
    return res.end();  //not allow
  }
  Solution.findOne({userName: name, cID: cid})
  .then(function(sol){
    if (sol) {
      req.session.msg = '该用户有提交记录，无法移除！';
      return res.end();
    }
    Contest.update(cid, {$pull: {contestants: name}})
    .then(function(){
      return ContestRank.remove({'_id.cid': cid, '_id.name': name});
    })
    .then(function(){
      req.session.msg = name+'已成功从该比赛中移除！';
      return res.end();
    })
    .fail(function(err){
      LogErr(err);
      req.session.msg = '系统错误！';
      return res.end();
    });
  })
  .fail(function(err){
    LogErr(err);
    req.session.msg = '系统错误！';
    return res.end();
  });
});

/*
 * 切换打星状态
 */
router.post('/toggleStar', function(req, res){
  res.header('Content-Type', 'text/plain');
  if (!req.session.user) {
    req.session.msg = 'Please login first!';
    return res.end();
  }
  var cid = parseInt(req.body.cid, 10);
  var str = clearSpace(req.body.str);
  var type = parseInt(req.body.type, 10);
  if (!cid || !str || !type) {
    return res.end();    //not allow!
  }
  Contest.watch(cid)
  .then(function(con){
    var name = req.session.user.name;
    if (name != con.userName && name != 'admin') {
      req.session.msg = 'You have no permission to do that!';
      return res.end();
    }
    if (!con) {
      return res.end();   //not allow!
    }
    var has = {}, names = [];
    str.split(' ').forEach(function(p){
        names.push(p);
    });
    return User.distinct('name', {name: {$in: names}});
  })
  .then(function(users){
    var val;
    if (type == 1) {
      val = {$addToSet: {stars: {$each: users}}};
    } else {
      val = {$pullAll: {stars: users}};
    }
    return Contest.update(cid, val);
  })
  .then(function(){
    req.session.msg = users.length+'个用户切换打星状态成功！';
    return res.end();
  })
  .fail(function(err){
    LogErr(err);
    req.session.msg = '系统错误！';
    return res.end();
  });
});

/*
 * 当contest处于pending状态时，需要每隔一段时间获取最新的contest.startTime, contest.len, svrTime
 */
router.post('/syncTime', function(req, res){
  res.header('Content-Type', 'text/plain');

  var cid = parseInt(req.body.cid, 10);
  var name = req.session.user ? req.session.user.name : '';
  Contest.watch(cid)
  .then(function(contest){
    if (!contest) {
      return res.end();
    }
    return res.json({
      startTime: contest.startTime,
      reg_state: getRegState(contest, name),
      contestants: contest.contestants.length,
      duration: contest.len * 60,
      svrTime: (new Date()).getTime()
    });
  })
  .fail(function(err){
    LogErr(err);
    return res.end();
  });
});

module.exports = router;
