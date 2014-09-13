
var router = require('express').Router();

var User = require('../models/user.js');
var Contest = require('../models/contest.js');

var KEY = require('./key');
var Settings = require('../settings');
var standings_pageNum = Settings.standings_pageNum;
var Comm = require('../comm');
var userCol = Comm.userCol;
var userTit = Comm.userTit;
var LogErr = Comm.LogErr;

/*
 * Standings页面
 */
router.get('/', function(req, res){
  var page = parseInt(req.query.page, 10);
  if (!page) {
    page = 1;
  } else if (page < 0) {
    return res.redirect('/standings');
  }
  var cid = parseInt(req.query.cid, 10);
  var q1 = {}, q2 = {};
  var search = Comm.clearSpace(req.query.search);
  if (search) {
    q1.name = q2.nick = new RegExp("^.*"+Comm.toEscape(search)+".*$", 'i');
  }
  var Q = { $or: [q1, q2], name: {$ne: 'admin'} };
  function RP() {
    User.get(Q, {rating: -1, name: 1}, page, standings_pageNum, function(err, users, n){
      if (err) {
        LogErr(err);
        req.session.msg = '系统错误！';
        return res.redirect('/');
      }
      if (n < 0) {
        return res.redirect('/standings');
      }
      var UC = {}, UT = {};
      if (users) {
        users.forEach(function(p, i){
          UC[p.name] = userCol(p.rating);
          UT[p.name] = userTit(p.rating);
        });
      }
      var Render = function() {
        res.render('standings', {
          title: 'Standings',
          key: KEY.STANDINGS,
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
      if (req.session.user && !search && !cid) {
        User.watch(req.session.user.name, function(err, user){
          if (err) {
            LogErr(err);
            req.session.msg = '系统错误！';
            return res.redirect('/');
          }
          if (!user) {
            return Render();
          }
          UC[user.name] = userCol(user.rating);
          UT[user.name] = userTit(user.rating);
          Comm.getRatingRank(user, function(err, rank){
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
  if (cid) {
    Contest.watch(cid, function(err, con){
      if (err) {
        LogErr(err);
        req.session.msg = '系统错误！';
        return res.redirect('/');
      }
      if (!con || con.type != 2 || !con.contestants) {
        return res.redirect('404');
      }
      Q.name = {$in: con.contestants};
      return RP();
    });
  } else {
    return RP();
  }
});

module.exports = router;
