/*
~key~
  -1: index
  0: user
  1: statistic
  3: problemset
  4: status
  5: ranklist
  6: contest
  7: standings
  8: problem
  9: onecontest
  10: submit
  11: sourcecode
  12: avatar
  17: topic
  18: onetopic
  1000/1001: addproblem
  1002: addcontest
  1004: addtopic

~addcontest~
  !cid: add a new contest
  cid < 0: clone a contest(clone a contest to DIY Contest)
  cid > 0: edit a contest

~contest.type~
  1: DIY Contest (all registered users can add)
  2: VIP Contest (only admin can add)

~session~
  req.session.user: current user
  req.session.cid: if current user has enter a private contest before,
    remember it, no need to wirte password again
*/

var async = require('async')
var crypto = require('crypto');
var fs = require('fs');
var gm = require('gm');
var imageMagick = gm.subClass({ imageMagick : true });
var exec = require('child_process').exec;
var IDs = require('../models/ids.js');
var ContestRank = require('../models/contestrank.js');
var User = require('../models/user.js');
var Solution = require('../models/solution.js');
var Problem = require('../models/problem.js');
var Contest = require('../models/contest.js');
var Topic = require('../models/topic.js');
var Comment = require('../models/comment.js');
var tCan = require('../models/can.js');
var xss = require('xss');

var settings = require('../settings');
var ranklist_pageNum = settings.ranklist_pageNum;
var standings_pageNum = settings.standings_pageNum;
var stats_pageNum = settings.stats_pageNum;
var contestRank_pageNum = settings.contestRank_pageNum;
var Tag = settings.T;
var ProTil = settings.P;
var Col = settings.C;
var Res = settings.R;
var UserCol = settings.UC;
var UserTitle = settings.UT;
var OE = settings.outputErr;
var addZero = settings.addZero;
var getDate = settings.getDate;
var languages = settings.languages;
var xss_options = settings.xss_options;

var data_path = settings.data_path;
var root_path = settings.root_path;

function nan(n) {
  return n != n;
}

function nil(n) {
  return (typeof(n) == 'undefined');
}

function trim(s) {
  if (nil(s)) return '';
  return String(s).replace(/(^\s*)|(\s*$)/g, '');
}

function drim(s) {
  if (nil(s)) return '';
  return String(s).replace(/(\s+)/g, ' ');
}

//delete unuseful ' ', '\t', '\n' ect...
function clearSpace(s) {
  return drim(trim(s));
}

function isUsername(s) {
  return (new RegExp("^[a-zA-Z0-9_]{2,15}$")).test(s);
}

function calDate(startTime, len) {
  return getDate((new Date(startTime)).getTime()+len*60000);
}

function CheckEscape(ch) {
  if (ch == '$' || ch == '(' || ch == ')' || ch == '*' || ch == '+' ||
      ch == '.' || ch == '[' || ch == ']' || ch == '?' || ch == '\\' ||
      ch == '^' || ch == '^' || ch == '{' || ch == '}' || ch == '|')
    return true;
  return false;
}

function toEscape(str) {
  var res = '';
  for (var i = 0; i < str.length; i++) {
    if (CheckEscape(str.charAt(i))) res += '\\';
    res += str.charAt(i);
  }
  return res;
}

function escapeHtml(s) {
  return s.toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function IsRegCon(s, name) {
  return s.indexOf(name) >= 0 ? true : false;
}

function regContestAndUpdate(cid, name, callback) {
  Contest.update(cid, {$addToSet: {contestants:name}}, function(err){
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

function gao(n, type) {
  if (n == 1) {
    if (type == 'hour')
      return 'an '+type+' ago';
    return 'a '+type+' ago';
  }
  return n+' '+type+'s ago';
}

function getAboutTime(n) {
  n = parseInt(n, 10);
  if (!n) return '';
  n = (new Date()).getTime() - n;
  var y = Math.floor(n/31104000000);
  if (y > 0) {
    return gao(y, 'year');
  }
  var m = Math.floor(n/2592000000);
  if (m > 0) {
    return gao(m, 'month');
  }
  var dd = Math.floor(n/86400000);
  if (dd > 0) {
    if (dd >= 7) {
      return gao(Math.floor(dd/7), 'week');
    }
    return gao(dd, 'day');
  }
  var hh = Math.floor(n/3600000);
  if (hh > 0) {
    return gao(hh, 'hour');
  }
  var mm = Math.floor(n/60000);
  if (mm > 0) {
    return gao(mm, 'minute')
  }
  return 'just now';
}

function getTime(n) {
  n = parseInt(n, 10);
  if (!n) return '';
  var date = new Date(n);
  var RP = addZero(date.getMonth()+1)+'-'+addZero(date.getDate())+' '
    +addZero(date.getHours())+':'+addZero(date.getMinutes());
  n = (new Date()).getTime() - n
  var y = (new Date()).getFullYear() - date.getFullYear();
  if (y > 0) {
    return date.getFullYear()+'-'+RP;
  }
  var d = Math.floor(n/86400000);
  if (d > 0) {
    return RP;
  }
  var h = Math.floor(n/3600000);
  if (h > 0) {
    return (h+'小时前');
  }
  var m = Math.floor(n/60000);
  if (m > 0) {
    return (m+'分钟前');
  }
  return '刚刚';
}

function getRatingRank(user, callback) {
  User.count({
    name: {$ne: 'admin'},
    $or:[
      { rating: {$gt: user.rating} },
      { rating: user.rating, name: {$lt: user.name} }
    ]
  }, function(err, rank) {
    return callback(err, rank+1);
  });
}

function getRank(user, callback) {
  User.count({
    name: {$ne: 'admin'},
    $or:[
      { solved: {$gt: user.solved} },
      { solved: user.solved, submit: {$lt: user.submit} },
      { solved: user.solved, submit: user.submit, name: {$lt: user.name} }
    ]
  }, function(err, rank) {
    return callback(err, rank+1);
  });
}

function getContestRank(cid, stars, name, V, callback) {
  ContestRank.count({
    '_id.cid': cid,
    '_id.name': {$nin: stars},
    $or: [{'value.solved': {$gt: V.solved}},
          {'value.solved': V.solved, 'value.penalty': {$lt: V.penalty}},
          {'value.solved': V.solved, 'value.penalty': V.penalty, 'value.submitTime': {$gt: V.submitTime}},
          {'value.solved': V.solved, 'value.penalty': V.penalty, 'value.submitTime': V.submitTime, '_id.name': {$lt: name}}]
  }, function(err, rank) {
    return callback(err, rank+1);
  });
}

exports.connectMongodb = function() {
  Solution.connect(function(err){
    if (err) {
      OE('connect failed');
      OE(err);
      throw err;
    }
  });
};

exports.disconnectMongodb = function() {
  Solution.disconnect(function(err){
    if (err) {
      OE('disconnect failed');
      OE(err);
      throw err;
    }
  });
};

exports.updateStatus = function(req, res) {
  res.header('Content-Type', 'text/plain');
  var id = parseInt(req.body.rid, 10);
  if (!id) {
    return res.end();  //not allow
  }
  Solution.watch({runID:id}, function(err, sol){
    if (err) {
      OE(err);
      return res.end(); //not refresh!
    }
    if (!sol) {
      return res.end(); //not allow
    }
    var RP = function(X){
      var t, m;
      if (X > 0) {
        t = m = '---';
      } else {
        t = sol.time; m = sol.memory;
      }
      return res.json({result: sol.result, time: t, memory: m, userName: sol.userName});
    };
    if (sol.cID == -1) {
      return RP(0);
    }
    var name = '';
    if (req.session.user) {
      name = req.session.user.name;
    }
    if (name == sol.userName || name == 'admin') {
      return RP(0);
    }
    Contest.watch(sol.cID, function(err, contest){
      if (err) {
        OE(err);
        return res.end();  //not refresh!
      }
      if (!contest) {
        return res.end();  //not allow
      }
      if (name == contest.userName ||
        (new Date()).getTime() - contest.startTime > contest.len*60000) {
        return RP(0);
      }
      return RP(1);
    });
  });
};

exports.getOverview = function(req, res) {
  res.header('Content-Type', 'text/plain');
  var cid = parseInt(req.body.cid, 10);
  if (!cid) {
    return res.end();  //not allow!
  }
  Solution.mapReduce({
    map: function(){
      var val = { AC:0, all:1 };
      if (this.result == 2) {
        val.AC = 1;
      }
      emit(this.problemID, val);
    },
    reduce: function(key, vals){
      val = { AC:0, all:0, result:null };
      vals.forEach(function(p, i){
        val.all += p.all;
        val.AC += p.AC;
      });
      return val;
    },
    query: {userName: {$ne: 'admin'}, cID: cid},
    sort: {runID: 1}
  }, function(err, results){
    if (err) {
      OE(err);
      return res.end();  //not refresh!
    }
    if (req.session.user) {
      Solution.aggregate([
      { $match: { userName: req.session.user.name, cID: cid, result:{$gt:1} } }
    , { $group: { _id: '$problemID', result: {$min: '$result'} } }
      ], function(err, sols){
        if (err) {
          OE(err);
          return res.end();  //not refresh!
        }
        return res.json([results, sols]);
      });
    } else {
      return res.json([results, null]);
    }
  });
};

exports.getStatus = function(req, res) {
  res.header('Content-Type', 'text/plain');
  var cid = parseInt(req.body.cid, 10);
  if (!cid) {
    return res.end();   //not allow!
  }
  Contest.watch(cid, function(err, contest){
    if (err) {
      OE(err);
      return res.end();  //not refresh!
    }
    if (!contest) {
      return res.end();  //not allow
    }
    var Q = {cID: cid}, page, name, pid, result, lang;
    page = parseInt(req.body.page, 10);
    if (!page) {
      page = 1;
    } else if (page < 0) {
      return res.end();   //not allow!
    }

    name = String(req.body.name);
    if (name) {
      Q.userName = String(req.body.name);
    }

    pid = parseInt(req.body.pid, 10);
    if (pid) {
      Q.problemID = pid;
    }

    result = parseInt(req.body.result, 10);
    if (result >= 0) {
      if (result == 9) {
        Q.result = { $in : [9, 10, 11, 12, 15] };
      } else {
        Q.result = result;
      }
    }

    lang = parseInt(req.body.lang, 10);
    if (lang) {
      Q.language = lang;
    }
    var name = '';
    if (req.session.user) {
      name = req.session.user.name;
    }
    if (name != 'admin') {
      Q.$nor = [{userName: 'admin'}];
    }
    Solution.get(Q, page, function(err, solutions, n) {
      if (err) {
        OE(err);
        return res.end();   //not refresh!
      }
      if (n < 0) {
        return res.end();   //not allow
      }
      var sols = new Array(), names = new Array(), has = {};
      if (solutions) {
        solutions.forEach(function(p, i){
          var T = '', M = '', L = '';
          if (name == p.userName || name == contest.userName ||
              (new Date()).getTime() - contest.startTime > contest.len*60000) {
            T = p.time; M = p.memory; L = p.length;
          }
          sols.push({
            runID   : p.runID,
            userName  : p.userName,
            problemID : p.problemID,
            result    : p.result,
            time      : T,
            memory    : M,
            language  : p.language,
            length    : L,
            inDate    : p.inDate
          });
          if (!has[p.userName]) {
            has[p.userName] = true;
            names.push(p.userName);
          }
        });
      }
      User.find({name: {$in: names}}, function(err, users){
        if (err) {
          OE(err);
          return res.end();   //not refresh
        }
        var rt = {};
        if (users) {
          users.forEach(function(p){
            rt[p.name] = p.rating;
          });
        }
        return res.json([sols, n, rt]);
      });
    });
  });
};

exports.getRanklist = function(req, res) {
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
    contestID  : cid,
    updateTime  : { $lt: now-30000 }    //距离上次聚合>=30秒, 聚合一次排名
  }, {
    $set: { updateTime: now }
  }, {
    new : false
  }, function(err, contest){
    if (err) {
      OE(err);
      return res.end();
    }
    var RP = function(con){
      ContestRank.get({'_id.cid': cid}, page, function(err, users, n){
        if (err) {
          OE(err);
          return res.end();
        }
        if (n < 0) {
          return res.end();
        }
        if (!users || users.length == 0) {
          return res.json([null, {}, {}, n, {}, 0, 0]);
        }
        var has = {}, names = new Array();
        var rt = {}, I = {}, Users = new Array();
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
          if (req.session.user && !hasMe && req.session.user.name == tmp.name) {
            hasMe = true;
          }
        });
        getContestRank(cid, con.stars, T, V, function(err, rank){
          if (err) {
            OE(err);
            return res.end();
          }
          if (req.session.user && !hasMe) {
            names.push(req.session.user.name);
          }
          User.find({name: {$in:names}}, function(err, U){
            if (err) {
              OE(err);
              return res.end();
            }
            if (U) {
              U.forEach(function(p){
                rt[p.name] = p.rating;
                I[p.name] = p.nick;
              });
            }
            var Resp = function() {
              ContestRank.count({'_id.cid': cid, 'value.submitTime': {$gt: 0}}, function(err, cnt){
                if (err) {
                  OE(err);
                  return res.end();
                }
                return res.json([Users, rt, I, n, con.FB, rank, cnt]);
              });
            };
            if (req.session.user && !hasMe) {
              ContestRank.findOne({'_id.cid': cid, '_id.name': req.session.user.name}, function(err, u){
                if (err) {
                  OE(err);
                  return res.end();
                }
                if (!u) {
                  return Resp();
                }
                getContestRank(cid, con.stars, u._id.name, u.value, function(err, rk){
                  var tp = {name: u._id.name, value: u.value, rank: rk};
                  if (rk <= rank) {
                    Users.unshift(tp);
                  } else {
                    Users.push(tp);
                  }
                  return Resp();
                });
              });
            } else {
              return Resp();
            }
          });
        });
      });
    };
    if (!contest) {
      Contest.watch(cid, function(err, con){
        if (err) {
          OE(err);
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
      Solution.findOne(Q, {runID: -1}, function(err, doc){
        if (err) {
          OE(err);
          return res.end();
        }
        if (!doc) {
          return RP(contest);
        }
        Solution.findOne({$and: [Q, {result: {$lt: 2}}]}, {runID: 1}, function(err, sol){
          if (err) {
            OE(err);
            return res.end();
          }
          var maxRunID;
          if (sol) {
            maxRunID = sol.runID - 1;
          } else {
            maxRunID = doc.runID;
          }
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
            if (err) {
              OE(err);
              return res.end();
            }
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
                OE(err);
                return res.end();
              }
              var FB = {};
              if (results) {
                results.forEach(function(p){
                  FB[p._id] = p.userName;
                });
              }
              Contest.findOneAndUpdate({contestID: cid}, {$set: {FB: FB, maxRunID: maxRunID}}, {new: true}, function(err, con){
                if (err) {
                  OE(err);
                  return res.end();
                }
                return RP(con);
              });
            });
          });
        });
      });
    }
  });
};

exports.getTopic = function(req, res) {
  res.header('Content-Type', 'text/plain');
  var cid = parseInt(req.body.cid, 10);
  if (!cid) {
    return res.end();   //not allow
  }
  Contest.watch(cid, function(err, contest){
    if (err) {
      OE(err);
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
        OE(err);
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
            lastReviewTime: getTime(p.lastReviewTime),
            lastComment: p.lastComment
          });
        });
      }
      User.find({name: {$in: names}}, function(err, users){
        if (err) {
          OE(err);
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
};

exports.addDiscuss = function(req, res) {
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
      OE(err);
      return res.end('1');
    }
    if (con.type == 2 && name != con.userName && !IsRegCon(con.contestants, name)) {
      req.session.msg = '发表失败！你还没注册此比赛！';
      return res.end('2');  //refresh
    }
    IDs.get('topicID', function(err, id){
      if (err) {
        OE(err);
        return res.end('1');
      }
      (new Topic({
        id      : id,
        title  : title,
        content : xss(content, xss_options),
        cid   : cid,
        user    : req.session.user.name,
        inDate  : (new Date()).getTime()
      })).save(function(err){
        if (err) {
          OE(err);
          return res.end('1');
        }
        return res.end();
      });
    });
  });
};

exports.getCE = function(req, res) {
  res.header('Content-Type', 'text/plain');
  if (!req.session.user)
    return res.end('Please login first!');
  var rid = parseInt(req.body.rid, 10);
  var name = req.session.user.name;
  if (!rid) {
    return res.end();  //not allow
  }
  Solution.watch({runID: rid}, function(err, solution){
    if (err) {
      OE(err);
      return res.end('系统错误！');
    }
    if (!solution) {
      return res.end(); //not allow
    }
    if (name != 'admin' && name != solution.userName) {
      return res.end('You have no permission to watch that Information!');
    }
    return res.end(solution.CE);
  });
};

exports.changeAddprob = function(req, res) {
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
  User.watch(name, function(err, user){
    if (err) {
      OE(err);
      req.session.msg = '系统错误！';
      return res.end();
    }
    user.addprob = !user.addprob;
    user.save(function(err){
      if (err) {
        OE(err);
        req.session.msg = '系统错误！';
        return res.end();
      }
      req.session.msg = 'The Information has been changed successfully!';
      return res.end();
    });
  });
};

exports.restorePsw = function(req, res) {
  res.header('Content-Type', 'text/plain');
  if (!req.session.user) {
    req.session.msg = 'Please login first!';
    return res.end();
  }
  if (req.session.user.name != 'admin') {
    req.session.msg = 'Failed! You have no permission to do that!';
    return res.end();
  }
  var name = String(req.body.name);
  if (!name)
    return res.end();  //not allow
  User.update({name: name}, {$set: {password: crypto.createHash('md5').update('123456').digest('base64')}}, function(err){
    if (err) {
      OE(err);
      req.session.msg = '系统错误！';
      return res.end();
    }
    req.session.msg = '已成功将'+name+'的密码恢复为"123456"！';
    return res.end();
  });
};

exports.changeInfo = function(req, res) {
  res.header('Content-Type', 'text/plain');
  if (!req.session.user) {
    req.session.msg = 'Please login first!';
    return res.end();
  }
  if (req.session.user.name != req.body.name) {
    req.session.msg = 'Failed! You have no permission to do that!';
    return res.end();
  }

  var name = clearSpace(req.body.name);
  var nick = clearSpace(req.body.nick);
  var oldpsw = req.body.oldpassword;
  var psw = req.body.password;
  var school = clearSpace(req.body.school);
  var email = clearSpace(req.body.email);
  var sig = clearSpace(req.body.signature);
  if (!name || !nick || !oldpsw ||
      school.length > 50 || email.length > 50 || sig.length > 200) {
    return res.end();  //not allow
  }

  var md5 = crypto.createHash('md5');
  var oldpassword = md5.update(oldpsw).digest('base64');

  User.watch(name, function(err, user){
    if (err) {
      OE(err);
      req.session.msg = '系统错误！';
      return res.end();
    }
    if (!user) {
      return res.end();  //not allow
    }
    if (oldpassword != user.password) {
      return res.end('1');
    }
    var H = {
      nick    : nick,
      school  : school,
      email  : email,
      signature : sig
    };
    if (psw) {
      var Md5 = crypto.createHash('md5');
      H.password = Md5.update(psw).digest('base64');
    }
    User.update({name: name}, H, function(err){
      if (err) {
        OE(err);
        req.session.msg = '系统错误！';
        return res.end();
      }
      req.session.msg = 'Your Information has been updated successfully!';
      return res.end();
    });
  });
};

exports.getProblem = function(req, res) {
  res.header('Content-Type', 'text/plain');
  var pid = parseInt(req.body.pid, 10);
  if (!pid) {
    return res.end();  //not allow!
  }
  var name = '';
  if (req.session.user) {
    name = req.session.user.name;
  }
  Problem.watch(pid, function(err, problem){
    if (err) {
      OE(err);
      return res.end();
    }
    if (!problem) {
      return res.end(); //not allow
    }
    var cid = parseInt(req.body.cid, 10);

    //get problem title for addcontest page
    if (!cid) {
      if (problem.hide == true && name != 'admin' && name != problem.manager) {
        return res.end();
      }
      return res.end(problem.title);
    }

    //get a problem for onecontest page
    Contest.watch(cid, function(err, con){
      if (err) {
        OE(err);
        return res.end();
      }
      if (!con || (name != con.userName && name != 'admin' &&
        (new Date()).getTime() < con.startTime)) {
        return res.end();
      }
      var lm = parseInt(req.body.lastmodified, 10);
      if (lm && lm == problem.lastmodified) {  //problem cache is ok.
        return res.end();
      }
      return res.json({
        problemID: problem.problemID,
        title: problem.title,
        timeLimit: problem.timeLimit,
        memoryLimit: problem.memoryLimit,
        description: problem.description,
        input: problem.input,
        output: problem.output,
        sampleInput: problem.sampleInput,
        sampleOutput: problem.sampleOutput,
        hint: problem.hint,
        spj: problem.spj,
        TC: problem.TC,
        lastmodified: problem.lastmodified
      });
    });
  });
};

exports.editTag = function(req, res) {
  res.header('Content-Type', 'text/plain');
  if (!req.session.user) {
    req.session.msg = 'Please login first!';
    return res.end();
  }
  var pid = parseInt(req.body.pid, 10);
  var tag = parseInt(req.body.tag, 10);
  if (!pid || !tag) {
    return res.end();  //not allow
  }
  var name = req.session.user.name;
  var RP = function(){
    var Q;
    if (req.body.add) {
      Q = {$addToSet: {tags:tag}};
    } else {
      Q = {$pull: {tags:tag}};
    }
    Problem.update(pid, Q, function(err, problem){
      if (err) {
        OE(err);
        req.session.msg = '系统错误！';
        return res.end();
      }
      if (req.body.add) {
        req.session.msg = 'Tag has been added to the problem successfully!';
      } else {
        req.session.msg = 'Tag has been removed from the problem successfully!';
      }
      return res.end();
    });
  };
  Problem.watch(pid, function(err, problem){
    if (err) {
      OE(err);
      req.session.msg = '系统错误！';
      return res.end();
    }
    if (!problem) {
      return res.end();  //not allow
    }
    if (req.body.add && problem.tags.length >= 5) {
      req.session.msg = 'The number of tags should not larger than 5!';
      return res.end();
    }
    if (name == 'admin' || name == problem.manager) {
      return RP();
    }
    Solution.watch({problemID:pid, userName:name, result:2}, function(err, solution) {
      if (err) {
        OE(err);
        req.session.msg = '系统错误！';
        return res.end();
      }
      if (!solution) {
        return res.end(); //not allow
      }
      return RP();
    });
  });
};

exports.doReg = function(req, res) {
  res.header('Content-Type', 'text/plain');
  var name = clearSpace(req.body.username);
  var nick = clearSpace(req.body.nick);
  var password = req.body.password;
  var vcode = clearSpace(req.body.vcode);
  var school = clearSpace(req.body.school);
  var email = clearSpace(req.body.email);
  var sig = clearSpace(req.body.signature);
  if (!name || !nick || !password || !vcode ||
      school.length > 50 || email.length > 50 || sig.length > 200) {
    return res.end();  //not allow
  }

  if (!isUsername(name)) {
    return res.end();  //not allow
  }
  if (vcode.toLowerCase() != req.session.verifycode) {
    return res.end('1');
  }

  User.watch(name, function(err, user){
    if (err) {
      OE(err);
      return res.end('3');
    }
    if (user) {
      return res.end('2');
    }
    var md5 = crypto.createHash('md5');
    var psw = md5.update(password).digest('base64');
    (new User({
      name      : name,
      password  : psw,
      regTime  : (new Date()).getTime(),
      nick      : nick,
      school    : school,
      email   : email,
      signature : sig
    })).save(function(err, user) {
      if (err) {
        OE(err);
        return res.end('3');
      }
      req.session.user = user;
      req.session.msg = 'Welcome, '+name+'. :)';
      return res.end();
    });
  });
};

exports.doLogin = function(req, res) {
  res.header('Content-Type', 'text/plain');
  var name = String(req.body.username);
  var psw = String(req.body.password);
  if (!name || !psw) {
    return res.end();  //not allow
  }
  //生成密码散列值
  var md5 = crypto.createHash('md5');
  var password = md5.update(psw).digest('base64');
  User.watch(name, function(err, user) {
    if (err) {
      OE(err);
      return res.end('3');
    }
    if (!user) {
      return res.end('1');
    }
    if (user.password != password) {
      return res.end('2');
    }
    user.visTime = (new Date()).getTime();
    user.save(function(err){
      if (err) {
        OE(err);
        return res.end('3');
      }
      req.session.user = user;
      req.session.msg = 'Welcome, '+user.name+'. :)';
      return res.end();
    });
  });
};

exports.loginContest = function(req, res) {
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
      OE(err);
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
};

exports.createVerifycode = function(req, res) {
  res.header('Content-Type', 'text/plain');
  tCan.Can(function(vcode, img){
    req.session.verifycode = vcode;
    return res.end(img);
  });
};

exports.upload = function(req, res) {
  res.header('Content-Type', 'text/plain');
  if (!req.files || !req.files.info) {
    return res.end();  //not allow
  }
  var path = req.files.info.path;
  var sz = req.files.info.size;
  var RP = function(s) {
    fs.unlink(path, function(){
      return res.end(s);
    });
  };
  if (!req.session.user) {
    req.session.msg = 'Failed! Please login first!';
    return RP('4');    //refresh!
  }
  var pid = parseInt(req.query.pid, 10);
  if (!pid) {
    return RP();    //not allow!
  }
  var lang = parseInt(req.body.lang, 10);
  if (!lang || lang < 1 || lang >= languages.length) {
    return RP('5'); //language not exist
  }
  if (sz < 50) {
    return RP('1');
  }
  if (sz > 65535){
    return RP('2');
  }
  var now = (new Date()).getTime();
  if (req.session.submitTime && now - req.session.submitTime <= 5000) {
    return RP('7');
  }
  req.session.submitTime = now;
  fs.readFile(path, function(err, data){
    if (err) {
      OE(err);
      return RP('3');
    }
    var code = String(data);
    if (lang < 3 && !req.body.ignore_i64 && code.indexOf("%I64") >= 0) {
      return RP('6'); //i64 alert
    }
    Problem.watch(pid, function(err, problem){
      if (err) {
        OE(err);
        return RP('3');
      }
      if (!problem) {
        return RP();  //not allow!
      }
      var name = req.session.user.name;
      IDs.get ('runID', function(err, id){
        if (err) {
          OE(err);
          return RP('3');
        }
        var newSolution = new Solution({
          runID: id,
          problemID: pid,
          userName: name,
          inDate: (new Date()).getTime(),
          language: lang,
          length: code.length,
          cID: -1,
          code: code
        });
        newSolution.save(function(err){
          if (err) {
            OE(err);
            return RP('3');
          }
          Problem.update(pid, {$inc: {submit: 1}}, function(err){
            if (err) {
              OE(err);
              return RP('3');
            }
            User.update({name: name}, {$inc: {submit: 1}}, function(err){
              if (err) {
                OE(err);
                return RP('3');
              }
              req.session.msg = 'The code for problem '+pid+' has been submited successfully!';
              return RP();
            });
          });
        });
      });
    });
  });
};

exports.rejudge = function(req, res) {
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
      OE(err);
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
        OE(err);
        return res.end();
      }
      Solution.distinct('userName', {problemID: pid, result: 2}, function(err, users){
        if (err) {
          OE(err);
          return res.end();
        }
        User.multiUpdate({'name': {$in: users}}, {$inc: {solved:-1}}, function(err){
          if (err) {
            OE(err);
            return res.end();
          }
          Solution.update({problemID: pid}, {$set: {result:0}}, function(err){
            if (err) {
              OE(err);
              return res.end();
            }
            Solution.distinct('cID', {problemID: pid, cID: {$gt: -1}}, function(err, cids){
              if (err) {
                OE(err);
                return res.end();
              }
              var RP = function() {
                if (!req.body.cid) {
                  req.session.msg = 'Problem '+pid+' has been Rejudged successfully!';
                  return res.end();
                }
                return res.end('1');
              };
              if (!cids || cids.length == 0) {
                return RP();
              }
              ContestRank.clear({'_id.cid': {$in: cids}}, function(err){
                if (err) {
                  OE(err);
                  return res.end();
                }
                Contest.multiUpdate({contestID: {$in: cids}}, {$set: {maxRunID: 0, updateTime: 0}}, function(err){
                  if (err) {
                    OE(err);
                    return res.end();
                  }
                  return RP();
                });
              });
            });
          });
        });
      });
    });
  });
};

exports.singleRejudge = function(req, res) {
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
      OE(err);
      return res.end('3');
    }
    if (!sol) {
      return res.end(); //not allow
    }
    var cid = sol.cID;
    if (cid == -1) {
      return res.end();
    }
    ContestRank.clear({'_id.cid': cid}, function(err){
      if (err) {
        OE(err);
        return res.end('3');
      }
      Contest.update(cid, {$set: {maxRunID: 0, updateTime: 0}}, function(err){
        if (err) {
          OE(err);
          return res.end('3');
        }
        return res.end();
      });
    });
  });
};

exports.recal = function(req, res) {
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
      emit(this.userName, {pids:null, submit:1, pid:this.problemID, result:this.result});
    },
    reduce: function(k, vals) {
      var val = {submit:0};
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
          return {solved:1, submit:1};
        } else {
          return {solved:0, submit:1};
        }
      } else {
        var has = {}, solved = 0;
        val.pids.forEach(function(p){
          if (!has[p]) {
            has[p] = true;
            ++solved;
          }
        });
        return {solved:solved, submit:val.submit};
      }
    },
    sort: {runID: -1}
  }, function(err, U){
    if (err) {
      OE(err);
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
        OE(err);
        req.session.msg = '系统错误！';
        return res.end();
      }
      req.session.msg = '统计完成！';
      return res.end();
    });
  });
};

exports.calRating = function(req, res) {
  res.header('Content-Type', 'text/plain');
  if (!req.session.user) {
    req.session.msg = 'Please login first!';
    return res.end('-1');
  }
  if (req.session.user.name != 'admin') {
    req.session.msg = 'Failed! You have no permission to Calculate Ratings.';
    return res.end('-2');
  }
  var cid = parseInt(req.body.cid, 10);
  if (!cid) {
    return res.end(); //not allow
  }
  Contest.watch(cid, function(err, contest){
    if (err) {
      OE(err);
      return res.end('-3');
    }
    if (!contest) {
      return res.end();       //not allow
    }
    var endTime = contest.startTime+contest.len*60000;
    if ((new Date()).getTime() <= endTime) {
      return res.end('-4');   //can not calculate rating because the contest is not finished.
    }
    contest.stars.push('admin');
    Solution.distinct('userName', {
      cID: cid,
      userName: {$nin: contest.stars},
      inDate: {$gte: contest.startTime, $lte: endTime}
    }, function(err, names){
      if (err) {
        OE(err);
        return res.end('-3');
      }
      ContestRank.getAll({'_id.cid': cid, '_id.name': {$in: names}}, function(err, R){
        if (err) {
          OE(err);
          return res.end('-3');
        }
        var rank = {}, act = {}, pos = -1;
        if (R && R.length) {
          R.forEach(function(p, i){
            if (!p.value || !p.value.solved) {
              if (pos < 0) pos = i;
              rank[p._id.name] = pos;
              act[p._id.name] = 0.5 * (R.length - pos - 1);
            } else {
              rank[p._id.name] = i;
              act[p._id.name] = R.length - i - 1;
            }
          });
        }
        User.find({name: {$in: names}}, function(err, U){
          if (err) {
            OE(err);
            return res.end('-3');
          }
          var cnt = 0;
          async.each(U, function(pi, cb){
            if (pi.lastRatedContest && cid <= pi.lastRatedContest) {
              return cb();
            }
            var old = pi.lastRatedContest ? pi.rating : 1500;
            var exp = 0;
            if (pi.lastRatedContest) {
              U.forEach(function(pj){
                if (pj.name != pi.name) {
                  exp += 1.0/(1.0 + Math.pow(10.0, ((pj.lastRatedContest ? pj.rating : 1500)-old)/400.0));
                }
              });
            } else {
              exp = R.length/2 + 1;
            }
            var K;
            if (old <= 2100) {
              K = 4;
            } else if (old <= 2400) {
              K = 2;
            } else {
              K = 1;
            }
            var newRating = Math.round(old + K*(act[pi.name]-exp)*0.5);
            User.update({name: pi.name}, {
              $set: {
                lastRatedContest: cid,
                rating: newRating
              },
              $push: {
                ratedRecord: { cid: cid, title: contest.title, rank: rank[pi.name], rating: newRating, inDate: endTime }
              }
            }, function(err){
              if (!err) {
                ++cnt;
              }
              return cb(err);
            });
          }, function(err){
            if (err) {
              OE(err);
              return res.end('-3');
            }
            return res.end(String(cnt));
          });
        });
      });
    });
  });
};

exports.resetRating = function(req, res) {
  res.header('Content-Type', 'text/plain');
  if (!req.session.user) {
    req.session.msg = 'Please login first!';
    return res.end('-1');
  }
  if (req.session.user.name != 'admin') {
    req.session.msg = 'Failed! You have no permission to Calculate Ratings.';
    return res.end('-2');
  }
  var cid = parseInt(req.body.cid, 10);
  if (!cid) {
    return res.end(); //not allow
  }
  User.findOne({lastRatedContest: {$gt: cid}}, function(err, user){
    if (err) {
      OE(err);
      return res.end('-3');
    }
    if (user) {
      return res.end('-4');
    }
    User.find({lastRatedContest: cid}, function(err, users){
      if (err) {
        OE(err);
        return res.end('-3');
      }
      var cnt = 0;
      async.each(users, function(p, cb){
        p.ratedRecord.pop();
        if (p.ratedRecord.length) {
          p.lastRatedContest = p.ratedRecord[p.ratedRecord.length - 1].cid;
          p.rating = p.ratedRecord[p.ratedRecord.length - 1].rating;
        } else {
          p.lastRatedContest = null;
          p.rating = 0;
        }
        p.save(function(err){
          if (!err) {
            ++cnt;
          }
          cb(err);
        });
      }, function(err){
        if (err) {
          OE(err);
          return res.end('-3');
        }
        return res.end(String(cnt));
      });
    });
  });
};

exports.index = function(req, res){
  Topic.topFive({top: true, cid: -1}, function(err, A){
    if (err) {
      OE(err);
      req.session.msg = '系统错误！';
      return res.redirect('/404');
    }
    Contest.topFive({type: 2}, function(err, B){
      if (err) {
        OE(err);
        req.session.msg = '系统错误！';
        return res.redirect('/404');
      }
      Topic.topFive({top: false, cid: -1}, function(err, C){
        if (err) {
          OE(err);
          req.session.msg = '系统错误！';
          return res.redirect('/404');
        }
        User.topFive({name: {$ne: 'admin'}}, function(err, D){
          if (err) {
            OE(err);
            req.session.msg = '系统错误！';
            return res.redirect('/404');
          }
          res.render('index', {
            title: 'ACdream Online Judge',
            key: -1,
            A: A,
            B: B,
            C: C,
            D: D,
            getTime: getTime,
            UT: UserTitle,
            UC: UserCol
          });
        });
      });
    });
  });
};

exports.user = function(req, res) {
  var name = req.params.name;
  if (!name) {
    return res.redirect('/404');
  }
  User.watch(name, function(err, user){
    if (err) {
      OE(err);
      req.session.msg = '系统错误！';
      return res.redirect('/');
    }
    if (!user) {
      return res.redirect('/404');
    }
    Solution.aggregate([
    { $match: { userName: name, result:{$gt:1} } }
  , { $group: { _id: '$problemID', result: {$min: '$result'} } }
  , { $sort: { _id: 1 } }
    ], function(err, sols){
      if (err) {
        OE(err);
        req.session.msg = '系统错误！';
        return res.redirect('/');
      }
      var A = new Array(), B = new Array();
      if (sols) {
        sols.forEach(function(p){
          if (p.result == 2) {
            A.push(p._id);
          } else {
            B.push(p._id);
          }
        });
      }
      var RP = function(H) {
        var mins = 1100;
        user.ratedRecord.forEach(function(i, p){
            if (p.rating < mins) {
              mins = p.rating;
            }
        });
        res.render('user', {
          title: 'User',
          key: 0,
          u: user,
          A: A,
          B: B,
          H: H,
          UC: UserCol,
          UT: UserTitle,
          getTime: getAboutTime,
          minRating: mins
        });
      };
      if (user.name != 'admin') {
        getRank(user, function(err, rank){
          if (err) {
            req.session.msg = '系统错误！';
            OE(err);
            return res.redirect('/');
          }
          user.rank = rank;
          return RP(null);
        });
      } else {
        Problem.distinct("problemID", {hide:true}, function(err, pids){
          if (err) {
            req.session.msg = '系统错误！';
            OE(err);
            return res.redirect('/');
          }
          return RP(pids);
        });
      }
    });
  });
};

exports.avatar = function(req, res) {
  if (!req.session.user) {
    req.session.msg = 'Please login first!';
    return res.redirect('/');
  }
  res.render('avatar', {
    title: 'Avatar Setting',
    key: 12
  });
};

exports.avatarUpload = function(req, res) {
  res.header('Content-Type', 'text/plain');
  if (!req.files || !req.files.img || !req.files.img.mimetype) {
    return res.end();   //not allow
  }
  var path = req.files.img.path;
  var sz = req.files.img.size;
  var tmp = req.files.img.mimetype.split('/');
  var imgType = tmp[1];
  var RP = function(s) {
    fs.unlink(path, function(){
      return res.end(s);
    });
  };
  if (!req.session.user) {
    return RP();  //not allow
  }
  if (sz > 2*1024*1024) {
    return RP('1');
  }
  if (tmp[0] != 'image') {
    return RP('2');
  }
  var pre = root_path+'public/img/avatar/' + req.session.user.name;
  var originImg = imageMagick(path);
  exec('rm -rf '+pre, function(err){
    if (err) {
      OE(err);
      return RP('3');
    }
    fs.mkdir(pre, function(err){
      if (err) {
        OE(err);
        return RP('3');
      }
      originImg.resize(250, 250, '!')
      .autoOrient()
      .write(pre+'/1.'+imgType, function(err){
        if (err) {
          OE(err);
          return RP('3');
        }
        originImg.resize(150, 150, '!')
        .autoOrient()
        .write(pre+'/2.'+imgType, function(err){
          if (err) {
            OE(err);
            return RP('3');
          }
          originImg.resize(75, 75, '!')
          .autoOrient()
          .write(pre+'/3.'+imgType, function(err){
            if (err) {
              OE(err);
              return RP('3');
            }
            originImg.resize(50, 50, '!')
            .autoOrient()
            .write(pre+'/4.'+imgType, function(err){
              if (err) {
                OE(err);
                return RP('3');
              }
              req.session.msg = '头像修改成功！';
              if (req.session.user.imgType == imgType) {
                return RP();
              }
              req.session.user.imgType = imgType;
              User.update({name: req.session.user.name}, {imgType: imgType}, function(err){
                if (err) {
                  OE(err);
                  return RP('3');
                }
                return RP();
              });
            });
          });
        });
      });
    });
  });
};

exports.addproblem = function(req, res) {
  if (!req.session.user) {
    req.session.msg = 'Please login first!';
    return res.redirect('/');
  }
  if (!req.session.user.addprob) {
    req.session.msg = 'You have no permission to Add or Edit problem!';
    return res.redirect('/');
  }
  var tk = 1000, pid = parseInt(req.query.pID);
  var RP = function(P, F, I) {
    if (P) {
      P.description = escapeHtml(P.description);
      P.input = escapeHtml(P.input);
      P.output = escapeHtml(P.output);
      P.hint = escapeHtml(P.hint);
    }
    res.render('addproblem', {
      title: 'AddProblem',
      problem: P,
      key: tk,
      files: F,
      imgs: I
    });
  };
  if (!pid) {
    return RP(null, null, null);
  } else {
    Problem.watch(pid, function(err, problem){
      if (err) {
        OE(err);
        req.session.msg = '系统错误！';
        return res.redirect('/');
      }
      if (!problem) {
        return RP(null, null, null);
      }
      if (problem.hide == true && req.session.user.name != 'admin' && req.session.user.name != problem.manager) {
        req.session.msg = 'You have no permission to edit this hidden problem!';
        return res.redirect('/');
      }
      ++tk;
      fs.readdir(root_path+'public/img/prob/'+pid, function(err, imgs){
        if (!imgs) imgs = [];
        fs.readdir(data_path+pid, function(err, files){
          if (!files) files = [];
          return RP(problem, files, imgs);
        });
      });
    });
  }
};

exports.doAddproblem = function(req, res) {
  if (!req.session.user) {
    req.session.msg = 'Please login first!';
    return res.redirect('/');
  }
  if (!req.session.user.addprob) {
    req.session.msg = 'Failed! You have no permission to Add or Edit problem.';
    return res.redirect('/');
  }
  var pid = parseInt(req.body.pid, 10);
  if (pid) {
    var title = clearSpace(req.body.Title);
    if (!title) title = 'NULL';
    var spj = parseInt(req.body.isSpj, 10);
    if (!spj) spj = 0;
    var tle = parseInt(req.body.Timelimit, 10);
    if (!tle) tle = 1000;
    var mle = parseInt(req.body.Memorylimit, 10);
    if (!mle) mle = 64000;
    var hide = false;
    if (req.body.hide == '1') hide = true;
    else hide = false;
    var tc = false;
    if (req.body.TC == '1') tc = true;
    else tc = false;
    Problem.update(pid, {$set: {
      title: title,
      description: String(req.body.Description),
      input: String(req.body.Input),
      output: String(req.body.Output),
      sampleInput: String(req.body.sInput),
      sampleOutput: String(req.body.sOutput),
      hint: String(req.body.Hint),
      source: clearSpace(req.body.Source),
      spj: spj,
      timeLimit: tle,
      memoryLimit: mle,
      hide: hide,
      TC: tc,
      lastmodified: (new Date()).getTime()
    }}, function(err) {
      if (err) {
        OE(err);
        req.session.msg = '系统错误！';
        return res.redirect('/');
      }
      req.session.msg = 'Problem '+pid+' has been updated successfully!';
      return res.redirect('/problem?pid='+pid);
    });
  } else {
    IDs.get ('problemID', function(err, id) {
      if (err) {
        OE(err);
        req.session.msg = '系统错误！';
        return res.redirect('/');
      }
      var manager = '';
      if (req.session.user.name != 'admin')
        manager = req.session.user.name;
      var newProblem = new Problem({
        problemID: id,
        manager: manager
      });
      newProblem.save(function(err){
        if (err) {
          OE(err);
          req.session.msg = '系统错误！';
          return res.redirect('/');
        }
        fs.mkdir(data_path+id, function(){
          req.session.msg = 'Problem '+id+' has been created successfully!';
          return res.redirect('/addproblem?pID='+id);
        });
      });
    });
  }
};

exports.imgUpload = function(req, res) {
  res.header('Content-Type', 'text/plain');
  if (!req.files || !req.files.info || !req.files.info.mimetype) {
    return res.end();   //not allow
  }
  var path = req.files.info.path;
  var sz = req.files.info.size;
  var pid = parseInt(req.query.pid, 10);
  var RP = function(s) {
    fs.unlink(path, function(){
      return res.end(s);
    });
  };
  if (!pid || !req.session.user) {
    return RP();  //not allow
  }
  if (sz > 2*1024*1024) {
    return RP('1');
  }
  if (req.files.info.mimetype.split('/')[0] != 'image') {
    return RP('2');
  }
  Problem.watch(pid, function(err, problem){
    if (err) {
      OE(err);
      return RP('3');
    }
    if (!problem) {
      return RP();  //not allow
    }
    User.watch(req.session.user.name, function(err, user) {
      if (err) {
        OE(err);
        return RP('3');
      }
      if (!user || !user.addprob) {
        return RP(); //not allow
      }
      var pre = root_path+'public/img/prob/'+pid;
      fs.mkdir(pre, function(){
        fs.rename(path, pre+'/'+req.files.info.name, function(err){
          if (err) {
            OE(err);
            return RP('3');
          }
          return RP();
        });
      });
    });
  });
};

exports.dataUpload = function(req, res) {
  res.header('Content-Type', 'text/plain');
  if (!req.files || !req.files.data) {
    return res.end();   //not allow
  }
  var path = req.files.data.path;
  var fname = req.files.data.name;
  var sz = req.files.data.size;
  var pid = parseInt(req.query.pid, 10);
  var RP = function(s) {
    fs.unlink(path, function(){
      return res.end(s);
    });
  };
  if (!pid || !req.session.user) {
    return RP();  //not allow
  }
  if (sz > 50*1024*1024) {
    return RP('2');
  }
  User.watch(req.session.user.name, function(err, user){
    if (err) {
      OE(err);
      return RP('3');
    }
    if (!user || !user.addprob) {
      return RP();
    }
    fs.readFile(path, function(err, data){
      if (err) {
        OE(err);
        return RP('3');
      }
      fs.mkdir(data_path+pid, function(){
        fs.writeFile(data_path+pid+'/'+fname, String(data).replace(/\r/g, ''), function(err){
          if (err) {
            OE(err);
            return RP('3');
          }
          return RP();
        });
      });
    });
  });
};

exports.delData = function(req, res) {
  res.header('Content-Type', 'text/plain');
  if (!req.session.user) {
    return res.end();  //not allow
  }
  var pid = parseInt(req.body.pid, 10);
  if (!pid) {
    return res.end();  //not allow
  }
  var fname = req.body.fname;
  if (!fname) {
    return res.end();  //not allow
  }
  User.watch(req.session.user.name, function(err, user){
    if (err) {
      OE(err);
      req.session.msg = '系统错误！';
      return res.end('1');    //refresh!
    }
    if (!user || !user.addprob) {
      return res.end();    //not allow!
    }
    fs.unlink(data_path+pid+'/'+fname, function(){
      return res.end();
    });
  });
};

exports.delImg = function(req, res) {
  res.header('Content-Type', 'text/plain');
  if (!req.session.user) {
    return res.end();
  }
  var pid = parseInt(req.body.pid, 10);
  if (!pid) {
    return res.end();  //not allow!
  }
  var fname = req.body.fname;
  if (!fname) {
    return res.end();  //not allow!
  }
  User.watch(req.session.user.name, function(err, user){
    if (err) {
      OE(err);
      req.session.msg = '系统错误！';
      return res.end('1');    //refresh!
    }
    if (!user || !user.addprob) {
      return res.end(); //not allow!
    }
    fs.unlink(root_path+'public/img/prob/'+pid+'/'+fname, function(){
      return res.end();
    });
  });
};

exports.logout = function(req, res) {
  res.header('Content-Type', 'text/plain');
  if (!req.session.user)
    return res.end();
  req.session.msg = 'Goodbye, '+req.session.user.name+'. Looking forward to seeing you at ACdream.';
  req.session.user = null;
  req.session.cid = null;
  return res.end();
};

exports.problem = function(req, res) {
  var pid = parseInt(req.query.pid, 10);
  if (!pid) {
    res.render('problem', {
      title: 'Problem',
      key: -1,
      problem: null
    });
  } else {
    var name = '', cid = parseInt(req.query.cid, 10);
    if (req.session.user) {
      name = req.session.user.name;
    }
    Solution.watch({problemID:pid, userName:name, result:2}, function(err, solution) {
      if (err) {
        OE(err);
        req.session.msg = '系统错误！';
        return res.redirect('/');
      }
      var pvl = 0;
      if (solution) {
        pvl = 1;
      }
      Problem.watch(pid, function(err, problem) {
        if (err) {
          OE(err);
          req.session.msg = '系统错误！';
          return res.redirect('/');
        }
        var RP = function(U){
          var UT, UC;
          if (U) {
            UT = UserTitle(U.rating);
            UC = UserCol(U.rating);
          }
          res.render('problem', {
            title: 'Problem ' + pid,
            key: 8,
            problem: problem,
            pvl: pvl,
            Tag: Tag,
            PT: ProTil,
            cid: cid,
            UT: UT,
            UC: UC,
            langs: languages
          });
        };
        if (problem) {
          if (pvl == 0 && (name == 'admin' || problem.manager == name)) {
            pvl = 1;
          }
          if (problem.hide == true && (!req.session.user ||
            (req.session.user.name != 'admin' && req.session.user.name != problem.manager))) {
            problem = null;
            return RP(null);
          }
          if (!problem.manager) {
            problem.manager = 'admin';
          }
          User.watch(problem.manager, function(err, user){
            if (err) {
              OE(err);
              req.session.msg = '系统错误！';
              return res.redirect('/');
            }
            return RP(user);
          });
        } else {
          return RP(null);
        }
      });
    });
  }
};

exports.problemset = function(req, res) {
  var page = parseInt(req.query.page, 10);
  if (!page) {
    page = 1;
  } else if (page < 0) {
    return res.redirect('/problemset');
  }

  var q1 = {}, q2 = {}, q3 = {}, Q, search = clearSpace(req.query.search);

  if (search) {
    var pattern = new RegExp("^.*"+toEscape(search)+".*$", 'i'), tag = new Array();
    for (i = 0; i < Tag.length; i++) {
      if (pattern.test(Tag[i])) {
        tag.push(i);
      }
    }
    q1.title = pattern;
    q2.tags = {$in: tag};
    q3.source = pattern;
  }

  if (!req.session.user) {
    Q = { $or:[q1, q2, q3], hide:false };
  } else if (req.session.user.name != 'admin') {
    Q = { $and: [{$or:[q1, q2, q3]}, {$or:[{hide:false}, {manager:req.session.user.name}]}] };
  } else Q = { $or:[q1, q2, q3] };
  Problem.get(Q, page, function(err, problems, n) {
    if (err) {
      OE(err);
      req.session.msg = '系统错误！';
      return res.redirect('/');
    }
    if (n < 0) {
      return res.redirect('/problemset');
    }
    var RP = function(R){
      res.render('problemset', {
        title: 'ProblemSet',
        key: 3,
        n: n,
        problems: problems,
        page: page,
        search: search,
        Tag: Tag,
        Pt: ProTil,
        R: R
      });
    };
    if (req.session.user && problems && problems.length > 0) {
      var pids = new Array(), R = {};
      problems.forEach(function(p){
        pids.push(p.problemID);
      });
      Solution.aggregate([
      { $match: { userName: req.session.user.name, result:{$gt:1} } }
    , { $group: { _id: '$problemID', result: {$min: '$result'} } }
    , { $sort: { _id: 1 } }
      ], function(err, sols){
        if (err) {
          OE(err);
          req.session.msg = '系统错误！';
          return res.redirect('/');
        }
        if (sols) {
          sols.forEach(function(p){
            if (p.result == 2) {
              R[p._id] = 2;
            } else {
              R[p._id] = 1;
            }
          });
          return RP(R);
        }
      });
    } else {
      return RP({});
    }
  });
};

exports.status = function(req, res) {
  var Q = {}, page, name, pid, result, lang;

  page = parseInt(req.query.page, 10);
  if (!page) {
    page = 1;
  } else if (page < 0) {
    return res.redirect('/status');
  }

  name = clearSpace(req.query.name);
  if (name) {
    Q.userName = toEscape(name);
  }

  pid = parseInt(req.query.pid, 10);
  if (pid) Q.problemID = pid;

  result = parseInt(req.query.result, 10);
  if (result < 0 || result > 15) {
    return res.redirect('/status');
  }
  if (result >= 0) {
    if (result == 9) {
      Q.result = { $in : [9, 10, 11, 12, 15] };
    } else {
      Q.result = result;
    }
  }

  lang = parseInt(req.query.lang, 10);
  if (lang) {
    if (lang < 1 || lang >= languages.length) {
      return res.redirect('/status');
    }
    Q.language = lang;
  }

  Solution.get(Q, page, function(err, sols, n) {
    if (err) {
      OE(err);
      req.session.msg = '系统错误！';
      return res.redirect('/');
    }
    if (n < 0) {
      return res.redirect('/status');
    }
    var flg = false, has = {};
    var names = new Array(), pids = new Array();
    var R = new Array(), C = new Array();
    if (sols) {
      sols.forEach(function(p, i){
        R.push(Res(p.result));
        C.push(Col(p.result));
        if (!has[p.userName]) {
          has[p.userName] = true;
          names.push(p.userName);
        }
        if (!has[p.problemID]) {
          has[p.problemID] = true;
          pids.push(p.problemID);
        }
      });
    }
    User.find({name: {$in: names}}, function(err, users){
      if (err) {
        OE(err);
        req.session.msg = '系统错误！';
        return res.redirect('/');
      }
      var UC = {}, UT = {};
      users.forEach(function(p){
        UC[p.name] = UserCol(p.rating);
        UT[p.name] = UserTitle(p.rating);
      });
      Problem.find({problemID: {$in: pids}}, function(err, probs){
        var P = {};
        probs.forEach(function(p){
          P[p.problemID] = p;
        });
        res.render('status', {
          title: 'Status',
          key: 4,
          n: n,
          sols: sols,
          getDate: getDate,
          name: name,
          pid: pid,
          result: result,
          lang: lang,
          Res: Res,
          Col: Col,
          P: P,
          R: R,
          C: C,
          UC: UC,
          UT: UT,
          page: page,
          langs: languages
        });
      });
    });
  });
};

exports.addcontest = function(req, res) {
  var type = parseInt(req.query.type, 10);
  if (!type || type < 1 || type > 2) {
    return res.redirect('/404');
  }
  if (!req.session.user) {
    req.session.msg = 'Please login first!';
    return res.redirect('/contest/'+type);
  }
  var RP = function(C, clone, type, E, P) {
    res.render('addcontest', {
      title: 'AddContest',
      contest: C,
      getDate: getDate,
      key: 1002,
      clone: clone,
      type: type,
      edit: E,
      P: P
    });
  }
  ,  name = req.session.user.name
  ,  cid = parseInt(req.query.cID, 10);

  if (!cid) {
    if (type == 2 && name != 'admin') {
      req.session.msg = 'You have no permission to add VIP Contest!';
      return res.redirect('/contest/2');
    }
    return RP(null, 0, type, true, {});
  } else {
    var clone = 0;
    if (cid < 0) {
      clone = 1;
      cid = -cid;
    }
    Contest.watch(cid, function(err, contest){
      if (err) {
        OE(err);
        req.session.msg = '系统错误！';
        return res.redirect('/');
      }
      if (!contest) {
        return res.redirect('/404');
      }
      if (clone == 0 && name != contest.userName && name != 'admin') {
        req.session.msg = 'You are not the manager of this contest!';
        return res.redirect('/onecontest/'+cid);
      }
      if (clone == 1 && name != contest.userName && name != 'admin') {
        if ((new Date()).getTime() - contest.startTime < contest.len*60000) {
          return res.end();  //not allow
        }
      }
      var TP = function(E) {
        var pids = new Array();
        if (contest.probs) {
          contest.probs.forEach(function(p){
            pids.push(p[0]);
          });
        }
        Problem.find({problemID: {$in: pids}}, function(err, problems){
          if (err) {
            OE(err);
            req.session.msg = '系统错误！';
            return res.redirect('/');
          }
          var P = {};
          if (problems) {
            problems.forEach(function(p){
              P[p.problemID] = p;
            });
          }
          return RP(contest, clone, null, E, P);
        });
      };
      if (clone == 1) {
        TP(true);
      } else {
        Solution.watch({cID: cid}, function(err, sol){
          if (err) {
            OE(err);
            req.session.msg = '系统错误！';
            return res.redirect('/');
          }
          var E = sol ? false : true;
          return TP(E);
        });
      }
    });
  }
};

exports.doAddcontest = function(req, res) {
  res.header('Content-Type', 'text/plain');

  var psw = '';
  var title = clearSpace(req.body.title);
  var date = clearSpace(req.body.date);
  var hour = addZero(req.body.hour);
  var min = addZero(req.body.min);
  var dd = parseInt(req.body.dd, 10);
  var hh = parseInt(req.body.hh, 10);
  var mm = parseInt(req.body.mm, 10);
  var penalty = parseInt(req.body.penalty, 10);
  var desc = clearSpace(req.body.desc);
  var anc = clearSpace(req.body.anc);
  var type = parseInt(req.body.type, 10);

  if (!title || !date || !hour || !min ||
      nan(dd) || nan(hh) || nan(mm) || !penalty ||
      !type || type < 1 || type > 2) {
    return res.end();  //not allow!
  }

  if (!req.session.user) {
    req.session.msg = 'Failed! Please login first!';
    return res.end();
  }
  var name = req.session.user.name;
  if (type == 2 && name != 'admin') {
    req.session.msg = 'Failed! You have no permission to add VIP Contest!';
    return res.end();
  }

  if (type == 2) {
    psw = req.body.psw ? '1' : '';
  } else if (req.body.psw) {
    var md5 = crypto.createHash('md5');
    psw = md5.update(req.body.psw).digest('base64');
  }

  var pids = new Array();
  if (req.body.pids && req.body.pids.length) {
    req.body.pids.forEach(function(p){
      pids.push(p);
    });
  }
  var alias = req.body.alias ? req.body.alias : {};
  var RP = function(ary) {
    var startTime = (new Date(date+' '+hour+':'+min)).getTime();
    var len = dd*1440 + hh*60 + mm;
    var cid = parseInt(req.body.cid, 10);
    if (cid) {
      Contest.watch(cid, function(err, con) {
        if (err) {
          OE(err);
          req.session.msg = '系统错误！';
          return res.end();
        }
        if (!con || con.type != type) {
          return res.end();  //not allow
        }
        if (name != con.userName && name != 'admin') {
          req.session.msg = 'Update Failed! You are not the manager!';
          return res.end();
        }
        con.title = title;
        var flg = false;
        if (con.startTime != startTime || con.len > len || con.penalty != penalty) {
          flg = true;
          con.updateTime = con.maxRunID = 0;
        }
        con.startTime = startTime;
        con.len = len;
        con.penalty = penalty;
        con.description = desc;
        con.msg = anc;
        if (con.password != req.body.psw)
          con.password = psw;
        var save = function() {
          con.save(function(err){
            if (err) {
              OE(err);
              req.session.msg = '系统错误！';
              return res.end();
            }
            req.session.msg = 'Your Contest has been updated successfully!';
            var tp = cid.toString();
            if (!flg) {
              return res.end(tp);
            }
            ContestRank.clear({'_id.cid':cid}, function(err){
              if (err) {
                OE(err);
                req.session.msg = '系统错误！';
                return res.end();
              }
              return res.end(tp);
            });
          });
        }, judge = function() {
          if (ary.length != con.probs.length) {
            return false;
          }
          for (var i = 0; i < ary.length; i++) {
            if (ary[i][0] != con.probs[i][0])
              return false;
          }
          return true;
        };
        if (judge()) {
          con.probs = ary;
          return save();
        }
        Solution.watch({cID: cid}, function(err, sol){
          if (err) {
            OE(err);
            req.session.msg = '系统错误！';
            return res.end();
          }
          if (!sol)
            con.probs = ary;
          return save();
        });
      });
    } else {
      if (!ary.length) {
        return res.end();  //not allow
      }
      IDs.get('contestID', function(err, id) {
        if (err) {
          OE(err);
          req.session.msg = '系统错误！';
          return res.end();
        }
        (new Contest({
          contestID   : id,
          userName    : name,
          title       : title,
          startTime   : startTime,
          len         : len,
          penalty     : penalty,
          description : desc,
          msg         : anc,
          probs       : ary,
          password    : psw,
          type        : type
        })).save(function(err) {
          if (err) {
            OE(err);
            req.session.msg = '系统错误！';
            return res.end();
          }
          req.session.msg = 'Your Contest has been added successfully!';
          return res.end(id.toString());
        });
      });
    }
  };
  Problem.find({problemID: {$in: pids}}, function(err, problems){
    if (err) {
      OE(err);
      req.session.msg = '系统错误！';
      return res.end();
    }
    var has = {};
    if (problems) {
      problems.forEach(function(p){
        has[p.problemID] = true;
      });
    }
    var ary = new Array();
    pids.forEach(function(p, i){
      if (has[p])
        ary.push([p, clearSpace(alias[i])]);
    });
    return RP(ary);
  });
};

exports.onecontest = function(req, res) {
  var cid = parseInt(req.params.cid, 10);
  if (!cid) {
    return res.redirect('/404');
  }
  Contest.watch(cid, function(err, contest) {
    if (err) {
      OE(err);
      req.session.msg = '系统错误！';
      return res.redirect('/');
    }
    if (!contest) {
      return res.redirect('/404');
    }
    if (contest.type != 2) {
      if (contest.password) {
        if (!req.session.user || (req.session.user.name != contest.userName && req.session.user.name != 'admin')) {
          if (!req.session.cid || !req.session.cid[cid]) {
            req.session.msg = 'you should login the contest '+cid+' first!';
            return res.redirect('/contest/'+contest.type);
          }
        }
      }
    }
    var isContestant = false;
    if (contest.type != 2 ||
      (req.session.user &&
        (req.session.user.name == contest.userName ||
        IsRegCon(contest.contestants, req.session.user.name)))) {
      isContestant = true;
    }
    var pids = new Array();
    if (contest.probs) {
      contest.probs.forEach(function(p){
        pids.push(p[0]);
      });
    }
    Problem.find({problemID: {$in: pids}}, function(err, problems){
      if (err) {
        OE(err);
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
          OE(err);
          req.session.msg = '系统错误！';
          return res.redirect('/');
        }
        if (!user) {
          return res.end();  //not allow
        }
        res.render('onecontest', {
          title: 'OneContest',
          key: 9,
          contest: contest,
          getDate: getDate,
          isContestant: isContestant,
          pageNum: contestRank_pageNum,
          MC: UserCol(user.rating),
          MT: UserTitle(user.rating),
          Pt: Pt,
          Col: Col,
          Res: Res,
          langs: languages
        });
      });
    });
  });
};

exports.contestDelete = function(req, res) {
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
      OE(err);
      req.session.msg = '系统错误！';
      return res.end();
    }
    if (name != con.userName && name != 'admin') {
      req.session.msg = 'Delete Failed! You are not the manager!';
      return res.end();
    }
    Solution.watch({cID: cid}, function(err, sol){
      if (err) {
        OE(err);
        req.session.msg = '系统错误！';
        return res.end();
      }
      if (sol) {
        req.session.msg = 'Can\'t delete the contest, because there are some submits in this contest!';
        return res.end();
      }
      Contest.remove(cid, function(err){
        if (err) {
          OE(err);
          req.session.msg = '系统错误！';
          return res.end();
        }
        req.session.msg = 'Contest '+cid+' has been Deleted successfully!';
        return res.end();
      });
    });
  });
};

exports.contest = function(req, res) {
  var type = parseInt(req.params.type, 10);
  if (!type || type < 1 || type > 2) {
    return res.redirect('/404');
  }
  if (!req.query.page) {
    page = 1;
  } else {
    page = parseInt(req.query.page, 10);
  }
  if (!page || page < 0) {
    return res.redirect('/contest/'+type);
  }

  var q1 = {type: type}, q2 = {type: type}, search = req.query.search;

  if (search) {
    q1.title = q2.userName = new RegExp("^.*"+toEscape(search)+".*$", 'i');
  }

  Contest.get({$or:[q1, q2]}, page, function(err, contests, n){
    if (err) {
      OE(err);
      req.session.msg = '系统错误！';
      return res.redirect('/');
    }
    if (n < 0) {
      return res.redirect('/contest/'+type);
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
        if (req.session.user && IsRegCon(p.contestants, req.session.user.name))
          R[i] = true;
      });
    }
    User.find({name: {$in: names}}, function(err, users){
      if (err) {
        OE(err);
        req.session.msg = '系统错误！';
        return res.redirect('/');
      }
      var UC = {}, UT = {};
      if (users) {
        users.forEach(function(p){
          UC[p.name] = UserCol(p.rating);
          UT[p.name] = UserTitle(p.rating);
        });
      }
      res.render('contest', {
        title: 'Contest',
        key: 6,
        type: type,
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
};

exports.ranklist = function(req, res) {
  var page = parseInt(req.query.page, 10);
  if (!page) {
    page = 1;
  } else if (page < 0) {
    return res.redirect('/ranklist');
  }
  var q1 = {}, q2 = {};
  var search = clearSpace(req.query.search);
  if (search) {
    q1.name = q2.nick = new RegExp("^.*"+toEscape(search)+".*$", 'i');
  }
  var Q = { $or: [q1, q2], name: {$ne: 'admin'} };
  User.get(Q, {solved: -1, submit: 1, name: 1}, page, ranklist_pageNum, function(err, users, n){
    if (err) {
      OE(err);
      req.session.msg = '系统错误！';
      return res.redirect('/');
    }
    if (n < 0) {
      return res.redirect('/ranklist');
    }
    var UC = {}, UT = {};
    if (users) {
      users.forEach(function(p, i){
        UC[p.name] = UserCol(p.rating);
        UT[p.name] = UserTitle(p.rating);
      });
    }
    var Render = function() {
      res.render('ranklist', {
        title: 'Ranklist',
        key: 5,
        n: n,
        users: users,
        page: page,
        pageNum: ranklist_pageNum,
        search: search,
        UC: UC,
        UT: UT
      });
    };
    if (req.session.user) {
      User.watch(req.session.user.name, function(err, user){
        if (err) {
          OE(err);
          req.session.msg = '系统错误！';
          return res.redirect('/');
        }
        if (!user) {
          return Render();
        }
        UC[user.name] = UserCol(user.rating);
        UT[user.name] = UserTitle(user.rating);
        getRank(user, function(err, rank){
          res.locals.user = user;
          res.locals.user.rank = rank;
          return Render();
        });
      });
    } else {
      return Render();
    }
  });
};

exports.standings = function(req, res) {
  var page = parseInt(req.query.page, 10);
  if (!page) {
    page = 1;
  } else if (page < 0) {
    return res.redirect('/standings');
  }
  var cid = parseInt(req.query.cid, 10);
  var RP = function(Q) {
    User.get(Q, {rating: -1, name: 1}, page, standings_pageNum, function(err, users, n){
      if (err) {
        OE(err);
        req.session.msg = '系统错误！';
        return res.redirect('/');
      }
      if (n < 0) {
        return res.redirect('/standings');
      }
      var UC = {}, UT = {};
      if (users) {
        users.forEach(function(p, i){
          UC[p.name] = UserCol(p.rating);
          UT[p.name] = UserTitle(p.rating);
        });
      }
      var Render = function() {
        res.render('standings', {
          title: 'Standings',
          key: 7,
          n: n,
          users: users,
          page: page,
          pageNum: standings_pageNum,
          search: search,
          UC: UC,
          UT: UT,
          cid: cid
        });
      };
      if (req.session.user) {
        User.watch(req.session.user.name, function(err, user){
          if (err) {
            OE(err);
            req.session.msg = '系统错误！';
            return res.redirect('/');
          }
          if (!user) {
            return Render();
          }
          UC[user.name] = UserCol(user.rating);
          UT[user.name] = UserTitle(user.rating);
          getRatingRank(user, function(err, rank){
            res.locals.user = user;
            res.locals.user.rank = rank;
            return Render();
          });
        });
      } else {
        return Render();
      }
    });
  };
  var q1 = {}, q2 = {};
  var search = clearSpace(req.query.search);
  if (search) {
    q1.name = q2.nick = new RegExp("^.*"+toEscape(search)+".*$", 'i');
  }
  var Q = { $or: [q1, q2], name: {$ne: 'admin'} };
  if (cid) {
    Contest.watch(cid, function(err, con){
      if (err) {
        OE(err);
        req.session.msg = '系统错误！';
        return res.redirect('/');
      }
      if (!con || con.type != 2 || !con.contestants) {
        return res.redirect('404');
      }
      Q.name = {$in: con.contestants};
      return RP(Q);
    });
  } else {
    return RP(Q);
  }
};

exports.submit = function(req, res) {
  res.render('submit', {
    title: 'Submit',
    key: 10,
    id: req.query.pid,
    langs: languages
  });
};

exports.doSubmit = function(req, res) {
  res.header('Content-Type', 'text/plain');
  if (!req.session.user) {
    req.session.msg = 'Please login first!';
    return res.end('1');
  }
  var now = (new Date()).getTime();
  if (req.session.submitTime && now - req.session.submitTime <= 5000) {
    return res.end('6');
  }
  req.session.submitTime = now;
  var cid = parseInt(req.body.cid, 10);
  var name = clearSpace(req.session.user.name);
  var pid = parseInt(req.body.pid, 10);
  var Str = String(req.body.code);
  var lang = parseInt(req.body.lang, 10);
  if (!name) {
    return res.end();  //not allow
  }
  if (!pid || !Str || Str.length < 50 || Str.length > 65536) {
    return res.end('4');
  }
  if (!lang || lang < 1 || lang >= languages.length) {
    return res.end('5');
  }
  var RP = function(){
    IDs.get('runID', function(err, id){
      if (err) {
        OE(err);
        return res.end('3');
      }
      var newSolution = new Solution({
        runID: id,
        problemID: pid,
        userName: name,
        inDate: (new Date()).getTime(),
        language: lang,
        length: Str.length,
        cID: cid,
        code: Str
      });
      newSolution.save(function(err){
        if (err) {
          OE(err);
          return res.end('3');
        }
        Problem.update(pid, {$inc: {submit: 1}}, function(err){
          if (err) {
            OE(err);
            return res.end('3');
          }
          User.update({name: name}, {$inc: {submit: 1}}, function(err){
            if (err) {
              OE(err);
              return res.end('3');
            }
            if (cid < 0) {
              req.session.msg = 'The code for problem '+pid+' has been submited successfully!';
            }
            return res.end();
          });
        });
      });
    });
  };
  Problem.watch(pid, function(err, problem){
    if (err) {
      OE(err);
      return res.end('3');
    }
    if (!problem) {
      return res.end('4');
    }
    if (!cid) {
      cid = -1;
      return RP();
    } else {
      Contest.watch(cid, function(err, contest){
        if (err) {
          OE(err);
          return res.end('3');
        }
        if (!contest) {
          return res.end(); //not allow
        }
        if (contest.type == 2 && name != contest.userName && !IsRegCon(contest.contestants, name)) {
          req.session.msg = 'You can not submit because you have not registered the contest yet!';
          return res.end('2');
        }
        return RP();
      });
    }
  });
};

exports.sourcecode = function(req, res) {
  var runid = parseInt(req.params.runid, 10);
  if (!runid) {
    return res.redirect('/404');
  }
  Solution.watch({runID:runid}, function(err, sol) {
    if (err) {
      OE(err);
      req.session.msg = '系统错误！';
      return res.redirect('/');
    }
    if (!sol) {
      return res.redirect('/404');
    }
    var RP = function(flg){
      res.render('sourcecode', {
        title: 'Sourcecode',
        key: 11,
        solution: sol,
        getDate: getDate,
        flg: flg,
        Res: Res
      });
    };
    if (!req.session.user) {
      return RP(false);
    }
    var name = req.session.user.name;
    if (name == sol.userName || name == 'admin') {
      return RP(true);
    }
    Problem.watch(sol.problemID, function(err, prob){
      if (err) {
        OE(err);
        req.session.msg = '系统错误！';
        return res.redirect('/');
      }
      if (!prob) {
        return res.redirect('/404');
      }
      if (name == prob.manager) {
        return RP(true);
      }
      if (sol.cID < 0) {
        return RP(false);
      }
      Contest.watch(sol.cID, function(err, contest){
        if (err) {
          OE(err);
          req.session.msg = '系统错误！';
          return res.redirect('/');
        }
        if (contest && name == contest.userName) {
          return RP(true);
        }
        return RP(false);
      });
    });
  });
};

exports.statistic = function(req, res) {
  var pid = parseInt(req.params.pid, 10);
  if (!pid) {
    return res.redirect('/404');
  }
  var page = parseInt(req.query.page, 10);
  if (!page) {
    page = 1;
  } else if (page < 0) {
    return res.redirect('/statistic/'+pid);
  }
  Problem.watch(pid, function(err, problem){
    if (err) {
      OE(err);
      req.session.msg = '系统错误！';
      return res.redirect('/');
    }
    if (!problem) {
      return res.redirect('/404');
    }
    var lang = parseInt(req.query.lang, 10), Q = {problemID:pid, result:2};
    if (lang < 1 || lang >= languages.length) {
      return res.redirect('/statistic/'+pid);
    }
    if (lang) {
      Q.language = lang;
    }
    Solution.distinct('userName', Q, function(err, users){
      if (err) {
        OE(err);
        req.session.msg = '系统错误！';
        return res.redirect('/');
      }
      var n = 0;
      if (users) n = users.length;
      if ((page-1)*stats_pageNum > n) {
        return res.redirect('/statistic/'+pid);
      }
      var sort_key = parseInt(req.query.sort), sq = {};
      if (sort_key < 1 || sort_key > 2) {
        return res.redirect('/statistic/'+pid);
      }
      if (!sort_key) {
        sq = {time: 1, memory: 1, length: 1, inDate: 1};
      } else if (sort_key == 1) {
        sq = {memory: 1, time: 1, length: 1, inDate: 1};
      } else if (sort_key == 2) {
        sq = {length: 1, time: 1, memory: 1, inDate: 1};
      }
      var Q1 = {problemID: pid, result: 2};
      var Q2 = {problemID: pid, result: {$gt: 1}};
      if (lang) {
        Q1.language = Q2.language = lang;
      }
      Solution.aggregate([{
        $match: Q1
      }, {$sort: sq}, {
        $group: {
          _id: '$userName',
          runID: {$first: '$runID'},
          cid: {$first: '$cID'},
          time: {$first: '$time'},
          memory: {$first: '$memory'},
          length: {$first: '$length'},
          language: {$first: '$language'},
          inDate: {$first: '$inDate'}
        }
      }, {$sort: sq}, {$skip: (page-1)*stats_pageNum}, {$limit: 20}
      ], function(err, sols){
        if (err) {
          OE(err);
          req.session.msg = '系统错误！';
          return res.redirect('/');
        }
        var names = new Array();
        if (sols) {
          sols.forEach(function(p){
            names.push(p._id);
          });
        }
        var N = {}, sum = 0, Q = {problemID: pid};
        Solution.aggregate([
          {$match : Q2}
        , {$group : { _id: '$result', val: {$sum:1} }}
        ], function(err, results){
          if (err) {
            OE(err);
            req.session.msg = '系统错误！';
            return res.redirect('/');
          }
          if (results) {
            var sum = 0;
            results.forEach(function(p, i){
              if (p._id > 8 && p._id < 13) {
                i = 9;
              } else {
                i = p._id;
              }
              if (!N[i]) {
                N[i] = p.val;
              } else {
                N[i] += p.val;
              }
              sum += p.val;
            });
            N[0] = sum;
          }
          User.find({name: {$in:names}}, function(err, users){
            if (err) {
              OE(err);
              req.session.msg = '系统错误！';
              return res.redirect('/');
            }
            var UC = {}, UT = {};
            if (users) {
              users.forEach(function(p){
                UC[p.name] = UserCol(p.rating);
                UT[p.name] = UserTitle(p.rating);
              });
            }
            res.render('statistic', {
              title: 'Problem Statistic',
              key: 1,
              pid: pid,
              sols: sols,
              getDate: getDate,
              N: N,
              Res: Res,
              page: page,
              pageNum: stats_pageNum,
              n: parseInt((n + stats_pageNum - 1) / stats_pageNum, 10),
              lang: lang,
              sort_key: sort_key,
              UC: UC,
              UT: UT,
              langs: languages
            });
          });
        });
      });
    });
  });
};

exports.contestReg = function(req, res) {
  res.header('Content-Type', 'text/plain');
  if (!req.session.user) {
    req.session.msg = 'Please login first!';
    return res.end();
  }
  if (req.session.user.name == 'admin') {
    return res.end('1');
  }
  var cid = parseInt(req.body.cid);
  Contest.watch(cid, function(err, contest){
    if (err) {
      OE(err);
      return res.end('2');
    }
    if (!contest || contest.type != 2 || contest.password) {
      return res.end();  //not allow
    }
    if (contest.startTime - (new Date()).getTime() < 300000) {
      return res.end('3');
    }
    regContestAndUpdate(cid, req.session.user.name, function(err){
      if (err) {
        OE(err);
        return res.end('2');
      }
      req.session.msg = 'Your Registeration has been submited successfully!';
      return res.end();
    });
  });
};

exports.regContestRemove = function(req, res) {
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
      OE(err);
      req.session.msg = '系统错误！';
      return res.end();
    }
    if (sol) {
      req.session.msg = '该用户有提交记录，无法移除！';
      return res.end();
    }
    Contest.update(cid, {$pull: {contestants: name}}, function(err){
      if (err) {
        OE(err);
        req.session.msg = '系统错误！';
        return res.end();
      }
      ContestRank.remove({'_id.cid': cid, '_id.name': name}, function(err){
        if (err) {
          OE(err);
          req.session.msg = '系统错误！';
          return res.end();
        }
        req.session.msg = name+'已成功从该比赛中移除！';
        return res.end();
      });
    });
  });
};

exports.toggleStar = function(req, res) {
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
      OE(err);
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
    if (str) {
      str.split(' ').forEach(function(p){
          names.push(p);
      });
    }
    User.distinct('name', {name: {$in: names}}, function(err, users){
      if (err) {
        OE(err);
        req.session.msg = '系统错误！';
        return res.end();
      }
      var H;
      if (type == 1)
        H = {$addToSet: {stars: {$each: users}}};
      else
        H = {$pullAll: {stars: users}};
      Contest.update(cid, H, function(err){
        if (err) {
          OE(err);
          req.session.msg = '系统错误！';
          return res.end();
        }
        req.session.msg = users.length+'个用户切换打星状态成功！';
        return res.end();
      });
    });
  });
};

exports.topic = function(req, res) {
  if (!req.query.page) {
    page = 1;
  } else {
    page = parseInt(req.query.page, 10);
  }
  if (!page || page < 0) {
    return res.redirect('/topic');
  }
  var search = req.query.search, q1 = {cid: -1}, q2 = {cid: -1};

  if (search) {
    q1.title = q2.user = new RegExp("^.*"+toEscape(search)+".*$", 'i');
  }
  Topic.get({$or:[q1, q2]}, page, function(err, topics, n){
    if (err) {
      OE(err);
      req.session.msg = '系统错误！';
      return res.redirect('/');
    }
    if (n < 0) {
      return res.redirect('/topic');
    }
    var names = new Array(), I = {}, has = {};
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
      });
    }
    User.find({name: {$in: names}}, function(err, users){
      if (err) {
        OE(err);
        req.session.msg = '系统错误！';
        return res.redirect('/');
      }
      if (users) {
        users.forEach(function(p){
          I[p.name] = p.imgType;
        });
      }
      res.render('topic', {
        title: 'Topic',
        key: 17,
        topics: topics,
        page: page,
        search: search,
        n: n,
        I: I,
        getDate: getTime
      });
    });
  });
};

exports.onetopic = function(req, res) {
  var tid = parseInt(req.params.id, 10);
  if (!tid) {
    return res.redirect('/404');
  }
  Topic.watch(tid, function(err, topic){
    if (err) {
      OE(err);
      req.session.msg = '系统错误！';
      return res.redirect('/');
    }
    if (!topic) {
      return res.redirect('/404');
    }
    Topic.update(tid, {$inc: {browseQty: 1}}, function(err){
      if (err) {
        OE(err);
        req.session.msg = '系统错误！';
        return res.redirect('/');
      }
      Comment.get({tid: topic.id}, function(err, comments){
        if (err) {
          OE(err);
          req.session.msg = '系统错误！';
          return res.redirect('/');
        }
        var names = new Array(), has = {}, com = new Array(), sub = {}, N = 0;
        if (comments) {
          N = comments.length;
          comments.forEach(function(p){
            if (!has[p.user]) {
              names.push(p.user);
              has[p.user] = true;
            }
            if (p.fa == -1) {
              com.push(p);
            } else {
              if (!sub[p.fa]) {
                sub[p.fa] = new Array();
              }
              sub[p.fa].push(p);
            }
          });
        }
        if (!has[topic.user]) {
          names.push(topic.user);
        }
        User.find({name: {$in: names}}, function(err, users){
          if (err) {
            OE(err);
            req.session.msg = '系统错误！';
            return res.redirect('/');
          }
          var UT = {}, UC = {}, IT = {};
          if (users) {
            users.forEach(function(p){
              UT[p.name] = UserTitle(p.rating);
              UC[p.name] = UserCol(p.rating);
              IT[p.name] = p.imgType;
            });
          }
          res.render('onetopic', {
            title: 'OneTopic',
            key: 18,
            topic: topic,
            comments: com,
            N: N,
            sub: sub,
            getDate: getTime,
            UT: UT,
            UC: UC,
            IT: IT
          });
        });
      });
    });
  });
};

exports.addtopic = function(req, res) {
  if (!req.session.user) {
    req.session.msg = '请先登录！';
    return res.redirect('/topic');
  }
  var RP = function(T, type) {
    if (T) {
      T.content = escapeHtml(T.content);
    }
    tCan.Can(function(vcode, img){
      req.session.verifycode = vcode;
      res.render('addtopic', {
        title: type + 'Topic',
        topic: T,
        key: 1004,
        vcode: img
      });
    });
  };
  var tid = parseInt(req.query.tid, 10);
  if (!tid) {
    return RP(null, 'Add');
  } else {
    var user = req.session.user.name;
    Topic.watch(tid, function(err, topic){
      if (err) {
        OE(err);
        req.session.msg = '系统错误！';
        return res.redirect('/');
      }
      if (user != 'admin' && user != topic.user) {
        req.session.msg = '抱歉，您不是该话题的主人，无法进入编辑！';
        return res.redirect('/topic');
      }
      return RP(topic, 'Edit');
    });
  }
};

exports.doAddtopic = function(req, res) {
  res.header('Content-Type', 'text/plain');
  if (!req.session.user) {
    req.session.msg = '请先登录！';
    return res.end();
  }
  var tid = parseInt(req.body.tid, 10);
  var title = clearSpace(req.body.title);
  var content = req.body.content; //can not do clearSpace because it is content
  var name = req.session.user.name;
  var cid = parseInt(req.body.cid, 10);
  if (!title || !content || !name) {
    return res.end();   //not allow!
  }
  if (!cid) {
    cid = -1;
  }
  if (tid) {
    var RP = function() {
      var now = (new Date()).getTime();
      Topic.update(tid, {$set: {
        title: title,
        content: xss(content, xss_options),
        inDate: now,
        lastReviewer: null,
        lastReviewTime: now
      }}, function(err){
        if (err) {
          OE(err);
          return res.end('2');    //not refresh for error
        }
        req.session.msg = '修改成功！';
        return res.end(tid.toString());
      });
    };
    if (name == 'admin') {
      return RP();
    }
    Topic.watch(tid, function(err, topic){
      if (err) {
        OE(err);
        return res.end('2');
      }
      if (!topic) {
        return res.end();  //not allow
      }
      if (topic.user != name) {
        req.session.msg = '抱歉，您不是该话题的主人，无权修改！';
        return res.end();
      }
      return RP();
    });
  } else {
    var vcode = clearSpace(req.body.vcode);
    if (!vcode) {
      return res.end();   //not allow
    }
    if (vcode.toLowerCase() != req.session.verifycode) {
      return res.end('1');
    }
    IDs.get('topicID', function(err, id){
      if (err) {
        OE(err);
        return res.end('2');
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
          OE(err);
          return res.end('2');
        }
        req.session.msg = '发布成功！';
        return res.end(id.toString());
      });
    });
  }
};

exports.toggleTop = function(req, res) {
  res.header('Content-Type', 'text/plain');
  if (!req.session.user || req.session.user.name != 'admin') {
    return res.end();  //not allow!
  }
  var tid = parseInt(req.body.tid, 10);
  if (!tid) {
    return res.end();  //not allow!
  }
  Topic.watch(tid, function(err, topic){
    if (err) {
      OE(err);
      req.session.msg = '系统错误！';
      return res.end();
    }
    if (!topic) {
      return res.end(); //not allow!
    }
    topic.top = !topic.top;
    topic.save(function(err){
      if (err) {
        OE(err);
        req.session.msg = '系统错误！';
        return res.end();
      }
      req.session.msg = '操作成功！';
      return res.end();
    });
  });
};

exports.toggleHide = function(req, res) {
  res.header('Content-Type', 'text/plain');
  if (!req.session.user) {
    req.session.msg = 'Please login first!';
    return res.end();
  }
  var pid = parseInt(req.body.pid, 10);
  if (!pid) {
    return res.end(); //not allow
  }
  Problem.watch(pid, function(err, problem){
    if (err) {
      OE(err);
      return res.end('3');
    }
    if (!problem) {
      return res.end(); //not allow
    }
    var name = req.session.user.name;
    if (name != 'admin' && name != problem.manager) {
      req.session.msg = 'You have no permission to do that!';
      return res.end();
    }
    problem.hide = !problem.hide;
    problem.save(function(err){
      if (err) {
        OE(err);
        return res.end('3');
      }
      if (problem.hide)
        return res.end('h');
      return res.end('s');
    });
  });
};

exports.review = function(req, res) {
  res.header('Content-Type', 'text/plain');
  if (!req.session.user) {
    req.session.msg = '请先登录！';
    return res.end();
  }
  var user = req.session.user.name;
  var tid = parseInt(req.body.tid, 10);
  var content = String(req.body.content); //can not do clearSpace because it is content
  var fa = parseInt(req.body.fa, 10);
  var at = clearSpace(req.body.at);
  if (!user || !tid || !content || !fa) {
    return res.end();   //not allow!
  }
  IDs.get('topicID', function(err, id){
    if (err) {
      OE(err);
      return res.end('3');
    }
    var now = (new Date()).getTime();
    (new Comment({
      id: id,
      content: xss(content, xss_options),
      user: user,
      tid: tid,
      fa: fa,
      at: at,
      inDate: now
    })).save(function(err){
      if (err) {
        OE(err);
        return res.end('3');
      }
      Topic.update(tid, {
        $set: {lastReviewer: user, lastReviewTime: now, lastComment: id},
        $inc: {reviewsQty: 1}
      }, function(err){
        if (err) {
          OE(err);
          return res.end('3');
        }
        req.session.msg = '回复成功！';
        return res.end();
      });
    });
  });
};

exports.delComment = function(req, res) {
  res.header('Content-Type', 'text/plain');
  if (!req.session.user) {
    req.session.msg = '请先登录！';
    return res.end();
  }
  var id = parseInt(req.body.id, 10);
  if (!id) {
    return res.end();   //not allow
  }
  var q = { id: id };
  if (req.session.user.name != 'admin') {
    q.user = req.session.user.name;
  }
  Comment.findOneAndRemove(q, function(err, comment){
    if (err) {
      OE(err);
      return res.end('3');
    }
    if (!comment) {
      return res.end();   //not allow
    }
    var Q = { fa: comment.id };
    Comment.count(Q, function(err, cnt){
      if (err) {
        OE(err);
        return res.end('3');
      }
      Comment.remove(Q, function(err){
        if (err) {
          OE(err);
          return res.end('3');
        }
        Comment.findLast({tid: comment.tid}, function(err, com){
          if (err) {
            OE(err);
            return res.end('3');
          }
          Topic.watch(comment.tid, function(err, topic){
            if (err) {
              OE(err);
              return res.end('3');
            }
            var set;
            if (com && com.inDate > topic.inDate) {
              set = {lastReviewer: com.user, lastReviewTime: com.inDate, lastComment: com.id};
            } else {
              set = {lastReviewer: null, lastReviewTime: topic.inDate, lastComment: null};
            }
            Topic.update(comment.tid, {
              $set: set,
              $inc: {reviewsQty: -(cnt+1)}
            }, function(err){
              if (err) {
                OE(err);
                return res.end('3');
              }
              req.session.msg = '删除成功！';
              return res.end();
            });
          });
        });
      });
    });
  });
};

exports.editComment = function(req, res) {
  res.header('Content-Type', 'text/plain');
  if (!req.session.user) {
    req.session.msg = '请先登录！';
    return res.end();
  }
  var id = parseInt(req.body.id, 10)
  ,   content = String(req.body.content);
  if (!id || !content) {
    return res.end();   //not allow
  }
  var Q = { id: id };
  if (req.session.user.name != 'admin') {
    Q.user = req.session.user.name;
  }
  Comment.update(Q, {$set: {content: xss(content, xss_options)}}, function(err){
    if (err) {
      OE(err);
      return res.end('3');
    }
    req.session.msg = '修改成功！';
    return res.end();
  });
};

exports.addContestant = function(req, res) {
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
      OE(err);
      return res.end('3');
    }
    if (!contest) {
      return res.end(); //not allow
    }
    User.watch(name, function(err, user){
      if (err) {
        OE(err);
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
          OE(err);
          return res.end('3');
        }
        IDs.get('topicID', function(err, id){
          if (err) {
            OE(err);
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
              OE(err);
              return res.end('3');
            }
            Topic.update(tid, {$inc: {reviewsQty: 1}}, function(err){
              if (err) {
                OE(err);
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
};

exports.setProblemManager = function(req, res) {
  res.header('Content-Type', 'text/plain');
  if (!req.session.user) {
    req.session.msg = 'Please login first!';
    return res.end();
  }
  if (req.session.user.name != 'admin') {
    return res.end(); //not allow
  }
  var pid = parseInt(req.body.pid, 10);
  var name = String(req.body.name);
  if (!pid || !name) {
    return res.end(); //not allow
  }
  User.watch(name, function(err, user){
    if (err) {
      OE(err);
      return res.end('3');
    }
    if (!user) {
      return res.end('1');
    }
    Problem.watch(pid, function(err, prob){
      if (err) {
        OE(err);
        return res.end('3');
      }
      if (!prob) {
        return res.end(); //not allow
      }
      prob.manager = name;
      prob.save(function(err){
        if (err) {
          OE(err);
          return res.end('3');
        }
        req.session.msg = 'The manager has been changed successfully!';
        return res.end();
      });
    });
  });
};
