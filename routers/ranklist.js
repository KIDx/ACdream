
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
  var cond = { $or: [q1, q2], name: {$ne: 'admin'} };
  User.get(cond, {solved: -1, submit: 1, name: 1}, page, ranklist_pageNum)
  .then(function(o){
    var UC = {}, UT = {};
    if (o.users) {
      o.users.forEach(function(p, i){
        UC[p.name] = userCol(p.rating);
        UT[p.name] = userTit(p.rating);
      });
    }
    var Render = function() {
      res.render('ranklist', {
        title: 'Ranklist',
        key: KEY.RANKLIST,
        n: o.totalPage,
        users: o.users,
        page: page,
        pageNum: ranklist_pageNum,
        search: search,
        UC: UC,
        UT: UT
      });
    };
    if (req.session.user && !search) {
      User.watch(req.session.user.name)
      .then(function(user){
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
      })
      .fail(function(err){
        FailRedirect(err, req, res);
      });
    } else {
      return Render();
    }
  })
  .fail(function(err){
    FailRedirect(err, req, res);
  });
});

module.exports = router;
