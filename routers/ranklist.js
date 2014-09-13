
var router = require('express').Router();

var User = require('../models/user.js');

var KEY = require('./key');
var Settings = require('../settings');
var ranklist_pageNum = Settings.ranklist_pageNum;
var Comm = require('../comm');
var userCol = Comm.userCol;
var userTit = Comm.userTit;
var LogErr = Comm.LogErr;

/*
 * Ranklist页面
 */
router.get('/', function(req, res) {
  var page = parseInt(req.query.page, 10);
  if (!page) {
    page = 1;
  } else if (page < 0) {
    return res.redirect('/ranklist');
  }
  var q1 = {}, q2 = {};
  var search = Comm.clearSpace(req.query.search);
  if (search) {
    q1.name = q2.nick = new RegExp("^.*"+Comm.toEscape(search)+".*$", 'i');
  }
  var Q = { $or: [q1, q2], name: {$ne: 'admin'} };
  User.get(Q, {solved: -1, submit: 1, name: 1}, page, ranklist_pageNum, function(err, users, n){
    if (err) {
      LogErr(err);
      req.session.msg = '系统错误！';
      return res.redirect('/');
    }
    if (n < 0) {
      return res.redirect('/ranklist');
    }
    var UC = {}, UT = {};
    if (users) {
      users.forEach(function(p, i){
        UC[p.name] = userCol(p.rating);
        UT[p.name] = userTit(p.rating);
      });
    }
    var Render = function() {
      res.render('ranklist', {
        title: 'Ranklist',
        key: KEY.RANKLIST,
        n: n,
        users: users,
        page: page,
        pageNum: ranklist_pageNum,
        search: search,
        UC: UC,
        UT: UT
      });
    };
    if (req.session.user && !search) {
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
        Comm.getRank(user, function(err, rank){
          res.locals.user = user;
          res.locals.user.rank = rank;
          return Render();
        });
      });
    } else {
      return Render();
    }
  });
});

module.exports = router;
