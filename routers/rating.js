
var router = require('express').Router();
var async = require('async');

var Contest = require('../models/contest.js');
var ContestRank = require('../models/contestrank.js');
var User = require('../models/user.js');
var Solution = require('../models/solution.js');

var Comm = require('../comm');
var LogErr = Comm.LogErr;

/*
 * 计算某个比赛的Rating
 */
router.post('/cal', function(req, res){
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
      LogErr(err);
      return res.end('-3');
    }
    if (!contest) {
      return res.end();       //not allow
    }
    var endTime = contest.startTime + contest.len*60000;
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
        LogErr(err);
        return res.end('-3');
      }
      ContestRank.getAll({'_id.cid': cid, '_id.name': {$in: names}}, function(err, R){
        if (err) {
          LogErr(err);
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
            LogErr(err);
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
            if (old < 1700) {
              K = 2;
            } else if (old < 1900) {
              K = 2.5;
            } else if (old < 2200) {
              K = 3;
            } else {
              K = 4.5;
            }
            var newRating = Math.round(old + K*(act[pi.name]-exp));
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
              LogErr(err);
              return res.end('-3');
            }
            return res.end(String(cnt));
          });
        });
      });
    });
  });
});

/*
 * 回退一个比赛的Rating(以栈的形式回退，如果某用户的最后一场比赛不是这场，则忽略该用户)
 */
router.post('/reset', function(req, res){
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
      LogErr(err);
      return res.end('-3');
    }
    if (user) {
      return res.end('-4');
    }
    User.find({lastRatedContest: cid}, function(err, users){
      if (err) {
        LogErr(err);
        return res.end('-3');
      }
      var cnt = 0;
      async.each(users, function(p, cb){
        p.ratedRecord.pop();
        if (p.ratedRecord.length) {
          p.lastRatedContest = p.ratedRecord[ p.ratedRecord.length - 1 ].cid;
          p.rating = p.ratedRecord[ p.ratedRecord.length - 1 ].rating;
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
          LogErr(err);
          return res.end('-3');
        }
        return res.end(String(cnt));
      });
    });
  });
});

module.exports = router;
