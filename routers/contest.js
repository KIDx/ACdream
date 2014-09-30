/*
 * contest.type
 *  = 1: DIY Contest (all users can add)
 *  = 2: VIP Contest (only admin can add)
 */

var router = require('express').Router();
var async = require('async');
var crypto = require('crypto');
var xss = require('xss');

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
var getContestRank = Comm.getContestRank;
var getRegState = Comm.getRegState;

/*
 * 注册比赛并且初始化该用户的ContestRank
 */
function regContestAndUpdate(cid, name, callback) {
  Contest.update(cid, {$addToSet: {contestants: name}}, function(err){
    if (err) {
      return callback(err);
    }
    ContestRank.findOne({'_id.cid': cid, '_id.name': name}, function(err, doc){
      if (err) {
        return callback(err);
      }
      if (doc) {
        return callback();
      }
      (new ContestRank(cid, name)).save(function(err){
        return callback(err);
      });
    });
  });
}

/*
 * 一个比赛的页面
 */
router.get('/', function(req, res){
  var cid = parseInt(req.query.cid, 10);
  if (!cid) {
    return res.redirect('/404');
  }

  var name = req.session.user ? req.session.user.name : '';

  Contest.watch(cid, function(err, contest) {
    if (err) {
      LogErr(err);
      req.session.msg = '系统错误！';
      return res.redirect('/');
    }
    if (!contest) {
      return res.redirect('/404');
    }
    if (contest.type !== 2 && contest.password) {
      if (name !== contest.userName && name !== 'admin') {
        if (!req.session.cid || !req.session.cid[cid]) {
          req.session.msg = 'You should login the contest '+cid+' first!';
          return res.redirect('/contest/list?type=1');
        }
      }
    }
    var pids = new Array();
    if (contest.probs) {
      contest.probs.forEach(function(p){
        pids.push(p[0]);
      });
    }
    Problem.find({problemID: {$in: pids}}, function(err, problems){
      if (err) {
        LogErr(err);
        req.session.msg = '系统错误！';
        return res.redirect('/');
      }
      var Pt = {};
      if (problems) {
        problems.forEach(function(p){
          Pt[p.problemID] = p;
        });
      }
      User.watch(contest.userName, function(err, user){
        if (err) {
          LogErr(err);
          req.session.msg = '系统错误！';
          return res.redirect('/');
        }
        if (!user) {
          return res.end();  //not allow
        }
        res.render('contest', {
          title: 'Contest '+cid,
          key: KEY.CONTEST,
          contest: contest,
          reg_state: getRegState(contest, name),
          type: contest.type,
          getDate: getDate,
          MC: userCol(user.rating),
          MT: userTit(user.rating),
          Pt: Pt,
          Col: solCol,
          Res: solRes,
          langs: languages
        });
      });
    });
  });
});

/*
 * 比赛列表页面
 */
router.get('/list', function(req, res){
  var type = parseInt(req.query.type, 10);
  if (!type || type < 1 || type > 2) {
    return res.redirect('/404');
  }

  var family = req.query.family;

  if (!req.query.page) {
    page = 1;
  } else {
    page = parseInt(req.query.page, 10);
  }

  var url = '/contest/list?type='+type + (family ? "&family="+family : "");

  if (!page || page < 0) {
    return res.redirect(url);
  }

  var Q = {type: type}, q1 = {}, q2 = {}, search = req.query.search;

  if (search) {
    q1.title = q2.userName = new RegExp("^.*"+Comm.toEscape(search)+".*$", 'i');
    Q.$or = [q1, q2];
  }

  if (type === 2 && family) {
    Q.family = family;
  }

  Contest.get(Q, page, function(err, contests, n){
    if (err) {
      LogErr(err);
      req.session.msg = '系统错误！';
      return res.redirect('/');
    }
    if (n < 0) {
      return res.redirect(url);
    }
    var T = new Array(), R = {}, now = (new Date()).getTime();
    var CS = {}, names = new Array();
    if (contests) {
      if (req.session.cid) {
        CS = req.session.cid;
      }
      contests.forEach(function(p, i){
        names.push(p.userName);
        T.push(p.startTime-now);
        if (req.session.user && isRegCon(p.contestants, req.session.user.name))
          R[i] = true;
      });
    }
    User.find({name: {$in: names}}, function(err, users){
      if (err) {
        LogErr(err);
        req.session.msg = '系统错误！';
        return res.redirect('/');
      }
      var UC = {}, UT = {};
      if (users) {
        users.forEach(function(p){
          UC[p.name] = userCol(p.rating);
          UT[p.name] = userTit(p.rating);
        });
      }
      res.render('contestlist', {
        title: 'ContestList',
        key: KEY.CONTEST_LIST,
        type: type,
        family: family,
        contests: contests,
        getDate: getDate,
        n: n,
        search: search,
        page: page,
        T: T,
        R: R,
        CS: CS,
        UC: UC,
        UT: UT
      });
    });
  });
});

/*
 * 比赛的overview页的AC/submit数以及当前用户AC状态的聚合
 */
router.post('/overview', function(req, res){
  res.header('Content-Type', 'text/plain');
  var cid = parseInt(req.body.cid, 10);
  if (!cid) {
    return res.end(); //not allow!
  }
  var resp = {stat: {}, self: {}};
  function getOverview(cb) {
    Overview.find({'_id.cid': cid}, function(err, objs){
      if (err) {
        return cb(err);
      }
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
      return cb();
    });
  }
  var arr = new Array();
  var sols;
  arr.push(
    function(cb) {
      var now = (new Date()).getTime();
      Contest.findOneAndUpdate({
        contestID: cid,
        overviewUpdateTime: { $lt: now-30000 }    //距离上次聚合>=30秒, 聚合一次Overview
      }, {
        $set: { overviewUpdateTime: now }
      }, {
        new: false
      }, function(err, contest){
        if (err) {
          return cb(err);
        }
        if (!contest) {
          return getOverview(cb);
        }
        Solution.findOne({cID: cid, runID: {$gt: contest.overviewRunID}}, {runID: -1}, function(err, sol){
          if (err) {
            return cb(err);
          }
          if (!sol) {
            return getOverview(cb);
          }
          Solution.findOne({cID: cid, result: {$lt: 2}}, {runID: 1}, function(err, sol2){
            if (err) {
              return cb(err);
            }
            var maxRunID;
            if (sol2 && sol.runID > sol2.runID - 1) {
              maxRunID = sol2.runID - 1;
            } else {
              maxRunID = sol.runID;
            }
            Solution.mapReduce({
              query: { userName: {$ne: 'admin'}, cID: cid, runID: {$gt: contest.overviewRunID, $lte: maxRunID} },
              map: function() {
                return emit({
                  cid: this.cID,
                  pid: this.problemID,
                  result: this.result === 2
                }, 1);
              },
              reduce: function(key, vals) {
                var val = 0;
                vals.forEach(function(p){
                  val += p;
                });
                return val;
              },
              out: { reduce: 'overviews' }
            }, function(err){
              if (err) {
                return cb(err);
              }
              Contest.update(cid, {$set: {overviewRunID: maxRunID}}, function(err){
                if (err) {
                  return cb(err);
                }
                return getOverview(cb);
              });
            });
          });
        });
      });
    }
  );
  if (req.session.user) {
    arr.push(
      function(cb) {
        Solution.aggregate([
          { $match: { userName: req.session.user.name, cID: cid, result: {$gt: 1} } }
        , { $group: { _id: '$problemID', result: {$min: '$result'} } }
        ], function(err, res){
          res.forEach(function(p){
            resp.self[p._id] = (p.result === 2);
          });
          return cb(err);
        });
      }
    );
  }
  async.each(arr, function(f, cb){
    f(cb);
  }, function(err){
    if (err) {
      LogErr(err);
      return res.end();  //not refresh!
    }
    return res.json(resp);
  });
});

/*
 * 比赛排名的聚合
 */
router.post('/ranklist', function(req, res){
  res.header('Content-Type', 'text/plain');
  var cid = parseInt(req.body.cid, 10);
  if (!cid || cid < 0) {
    return res.end();
  }
  var page = parseInt(req.body.page, 10);
  if (!page) {
    page = 1;
  } else if (page < 0) {
    return res.end();
  }
  var now = (new Date()).getTime();
  Contest.findOneAndUpdate({
    contestID: cid,
    updateTime: { $lt: now-30000 }    //距离上次聚合>=30秒, 聚合一次排名
  }, {
    $set: { updateTime: now }
  }, {
    new: false
  }, function(err, contest){
    if (err) {
      LogErr(err);
      return res.end();
    }
    var RP = function(con){
      ContestRank.get({'_id.cid': cid}, page, function(err, users, n){
        if (err) {
          LogErr(err);
          return res.end();
        }
        if (n < 0) {
          return res.end();
        }

        var currentUser = req.session.user ? req.session.user.name : '';
        var resp = {
          pageNum: n,
          startTime: con.startTime,
          reg_state: getRegState(con, currentUser),
          contestants: con.contestants.length,
          duration: con.len * 60,
          svrTime: (new Date()).getTime()
        };

        if (!users || users.length == 0) {
          return res.json(resp);
        }
        var has = {}, names = new Array();
        var Users = new Array();
        var V = users[0].value, T = users[0]._id.name;
        if (con.stars) {
          con.stars.forEach(function(p){
            has[p] = true;
          });
        }
        var hasMe = false;
        users.forEach(function(p, i){
          var tmp = {name: p._id.name, value: p.value};
          if (has[tmp.name]) {
            tmp.star = true;
          }
          Users.push(tmp);
          names.push(tmp.name);
          if (!hasMe && currentUser == tmp.name) {
            hasMe = true;
          }
        });
        var rank, rt = {}, I = {}, me, cnt;
        var arr = [
          function(cb) {
            getContestRank(cid, con.stars, T, V, function(err, res){
              rank = res;
              return cb(err);
            });
          },
          function(cb) {
            User.find({name: {$in: names}}, function(err, U){
              if (U) {
                U.forEach(function(p){
                  rt[p.name] = p.rating;
                  I[p.name] = p.nick;
                });
              }
              return cb(err);
            });
          },
          function(cb) {
            ContestRank.count({'_id.cid': cid, 'value.submitTime': {$gt: 0}}, function(err, res){
              cnt = res;
              return cb(err);
            });
          }
        ];
        if (currentUser && !hasMe) {
          names.push(currentUser);
          arr.push(
            function(cb) {
              ContestRank.findOne({'_id.cid': cid, '_id.name': currentUser}, function(err, u){
                if (err) {
                  return cb(err);
                }
                if (!u) {
                  return cb();
                }
                getContestRank(cid, con.stars, u._id.name, u.value, function(err, rk){
                  if (err) {
                    return cb(err);
                  }
                  var tp = {name: u._id.name, value: u.value, rank: rk};
                  if (rk <= rank) {
                    Users.unshift(tp);
                  } else {
                    Users.push(tp);
                  }
                  return cb();
                });
              });
            }
          );
        }
        async.each(arr, function(func, cb){
          func(cb);
        }, function(err){
          if (err) {
            LogErr(err);
            return res.end();
          }
          resp.users = Users;
          resp.ratings = rt;
          resp.I = I;
          resp.fb = con.FB;
          resp.rank = rank;
          resp.total = cnt;
          return res.json(resp);
        });
      });
    };
    if (!contest) {
      Contest.watch(cid, function(err, con){
        if (err) {
          LogErr(err);
          return res.end();
        }
        if (!con) {
          return res.end();
        }
        return RP(con);
      });
    } else {
      var indate = {$gte: contest.startTime, $lte: contest.startTime+contest.len*60000};
      var Q = {
        cID: cid,
        userName: {$ne: 'admin'},
        inDate: indate,
        runID: {$gt: contest.maxRunID}
      };
      var maxRunID;
      var arr = [
        function(cb) {
          Solution.mapReduce({
            query: {$and: [Q, {runID: {$lte: maxRunID}}]},
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
          }, function(err){
            return cb(err);
          });
        },
        function(cb) {
          Solution.aggregate([{
            $match: {
              cID: cid,
              userName: {$ne: 'admin'},
              inDate: indate,
              result: 2
            }
          }, {$sort: {runID: 1}}, { $group: { _id: '$problemID', userName: {$first: '$userName'} } }
          ], function(err, results){
            if (err) {
              return cb(err);
            }
            var FB = {};
            if (results) {
              results.forEach(function(p){
                FB[p._id] = p.userName;
              });
            }
            Contest.findOneAndUpdate({contestID: cid}, {$set: {FB: FB, maxRunID: maxRunID}}, {new: true}, function(err, con){
              contest = con; //update contest because of the FB
              return cb(err);
            });
          });
        }
      ];
      Solution.findOne(Q, {runID: -1}, function(err, doc){
        if (err) {
          LogErr(err);
          return res.end();
        }
        if (!doc) {
          return RP(contest);
        }
        Solution.findOne({$and: [Q, {result: {$lt: 2}}]}, {runID: 1}, function(err, sol){
          if (err) {
            LogErr(err);
            return res.end();
          }
          if (sol) {
            maxRunID = sol.runID - 1;
          } else {
            maxRunID = doc.runID;
          }
          async.each(arr, function(func, cb){
            func(cb);
          }, function(err){
            if (err) {
              LogErr(err);
              return res.end();
            }
            if (!contest) {
              return res.end();
            }
            return RP(contest);
          });
        });
      });
    }
  });
});

/*
 * 在一个比赛中发帖
 */
router.post('/addDiscuss', function(req, res){
  res.header('Content-Type', 'text/plain');
  if (!req.session.user) {
    req.session.msg = '请先登录！';
    return res.end('2');    //refresh
  }
  var title = clearSpace(req.body.title);
  var content = clearSpace(req.body.content);
  var name = req.session.user.name;
  var cid = parseInt(req.body.cid, 10);
  if (!title || !content || !name || ! cid) {
    return res.end();    //not allow
  }
  Contest.watch(cid, function(err, con){
    if (err) {
      LogErr(err);
      return res.end('1');
    }
    if (con.type == 2 && name != con.userName && !isRegCon(con.contestants, name)) {
      req.session.msg = '发表失败！你还没注册该比赛！';
      return res.end('2');  //refresh
    }
    IDs.get('topicID', function(err, id){
      if (err) {
        LogErr(err);
        return res.end('1');
      }
      (new Topic({
        id: id,
        title: title,
        content: xss(content, xss_options),
        cid: cid,
        user: req.session.user.name,
        inDate: (new Date()).getTime()
      })).save(function(err){
        if (err) {
          LogErr(err);
          return res.end('1');
        }
        return res.end();
      });
    });
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
  Contest.watch(cid, function(err, contest){
    if (err) {
      LogErr(err);
      return res.end();  //not refresh
    }
    if (!contest) {
      return res.end();  //not allow
    }
    var page;
    page = parseInt(req.body.page, 10);
    if (!page) {
      page = 1;
    } else if (page < 0) {
      return res.end();  //not allow
    }
    Topic.get({cid: cid}, page, function(err, topics, n){
      if (err) {
        LogErr(err);
        return res.end(); //not refresh
      }
      if (n < 0) {
        return res.end(); //not allow
      }
      var names = new Array(), tps = new Array(), I = {}, has = {};
      if (topics) {
        topics.forEach(function(p){
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
      }
      User.find({name: {$in: names}}, function(err, users){
        if (err) {
          LogErr(err);
          return res.end();  //not refresh
        }
        if (users) {
          users.forEach(function(p){
            I[p.name] = p.imgType;
          });
        }
        res.json([tps, n, I]);
      });
    });
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
  Contest.watch(cid, function(err, contest){
    if (err) {
      LogErr(err);
      return res.end();
    }
    var md5 = crypto.createHash('md5');
    psw = md5.update(req.body.psw).digest('base64');
    if (psw == contest.password) {
      if (!req.session.cid) req.session.cid = {};
      req.session.cid[req.body.cid] = true;
      return res.end('1');
    }
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
  Contest.watch(cid, function(err, con){
    if (err) {
      LogErr(err);
      req.session.msg = '系统错误！';
      return res.end();
    }
    if (name != con.userName && name != 'admin') {
      req.session.msg = 'Delete Failed! You are not the manager!';
      return res.end();
    }
    Solution.watch({cID: cid}, function(err, sol){
      if (err) {
        LogErr(err);
        req.session.msg = '系统错误！';
        return res.end();
      }
      if (sol) {
        req.session.msg = 'Can\'t delete the contest, because there are some submits in this contest!';
        return res.end();
      }
      Contest.remove(cid, function(err){
        if (err) {
          LogErr(err);
          req.session.msg = '系统错误！';
          return res.end();
        }
        req.session.msg = 'Contest '+cid+' has been Deleted successfully!';
        return res.end();
      });
    });
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
  Contest.watch(cid, function(err, contest){
    if (err) {
      LogErr(err);
      return res.end('2');
    }
    if (!contest || contest.type != 2 || contest.password) {
      return res.end();  //not allow
    }
    if (getRegState(contest, name) === 2) {
      return res.end('3');
    }
    regContestAndUpdate(cid, name, function(err){
      if (err) {
        LogErr(err);
        return res.end('2');
      }
      req.session.msg = 'Your Registeration has been submited successfully!';
      return res.end();
    });
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
  Contest.watch(cid, function(err, contest){
    if (err) {
      LogErr(err);
      return res.end('3');
    }
    if (!contest) {
      return res.end(); //not allow
    }
    User.watch(name, function(err, user){
      if (err) {
        LogErr(err);
        return res.end('3');
      }
      if (!user) {
        return res.end(); //not allow
      }
      if (contest.contestants.indexOf(user.name) >= 0) {
        return res.end('1');
      }
      regContestAndUpdate(cid, name, function(err){
        if (err) {
          LogErr(err);
          return res.end('3');
        }
        IDs.get('topicID', function(err, id){
          if (err) {
            LogErr(err);
            return res.end('3');
          }
          (new Comment({
            id: id,
            content: '添加完成~',
            user: 'admin',
            tid: tid,
            fa: fa,
            at: name,
            inDate: (new Date()).getTime()
          })).save(function(err){
            if (err) {
              LogErr(err);
              return res.end('3');
            }
            Topic.update(tid, {$inc: {reviewsQty: 1}}, function(err){
              if (err) {
                LogErr(err);
                return res.end('3');
              }
              req.session.msg = '添加完成！';
              return res.end();
            });
          });
        });
      });
    });
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
  Solution.watch({userName: name, cID: cid}, function(err, sol){
    if (err) {
      LogErr(err);
      req.session.msg = '系统错误！';
      return res.end();
    }
    if (sol) {
      req.session.msg = '该用户有提交记录，无法移除！';
      return res.end();
    }
    Contest.update(cid, {$pull: {contestants: name}}, function(err){
      if (err) {
        LogErr(err);
        req.session.msg = '系统错误！';
        return res.end();
      }
      ContestRank.remove({'_id.cid': cid, '_id.name': name}, function(err){
        if (err) {
          LogErr(err);
          req.session.msg = '系统错误！';
          return res.end();
        }
        req.session.msg = name+'已成功从该比赛中移除！';
        return res.end();
      });
    });
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
  Contest.watch(cid, function(err, con){
    if (err) {
      LogErr(err);
      req.session.msg = '系统错误！';
      return res.end();
    }
    var name = req.session.user.name;
    if (name != con.userName && name != 'admin') {
      req.session.msg = 'You have no permission to do that!';
      return res.end();
    }
    if (!con) {
      return res.end();   //not allow!
    }
    var has = {}, names = new Array();
    str.split(' ').forEach(function(p){
        names.push(p);
    });
    User.distinct('name', {name: {$in: names}}, function(err, users){
      if (err) {
        LogErr(err);
        req.session.msg = '系统错误！';
        return res.end();
      }
      var H;
      if (type == 1) {
        H = {$addToSet: {stars: {$each: users}}};
      } else {
        H = {$pullAll: {stars: users}};
      }
      Contest.update(cid, H, function(err){
        if (err) {
          LogErr(err);
          req.session.msg = '系统错误！';
          return res.end();
        }
        req.session.msg = users.length+'个用户切换打星状态成功！';
        return res.end();
      });
    });
  });
});

/*
 * 当contest处于pending状态时，需要每隔一段时间获取最新的contest.startTime, contest.len, svrTime
 */
router.post('/syncTime', function(req, res){
  res.header('Content-Type', 'text/plain');

  var cid = parseInt(req.body.cid, 10);
  var name = req.session.user ? req.session.user.name : '';
  Contest.watch(cid, function(err, contest){
    if (err) {
      LogErr(err);
      return res.end();
    }
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
  });
});

module.exports = router;
