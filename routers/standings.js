
var router = require('express').Router();
var Q = require('q');

var User = require('../models/user.js');
var Contest = require('../models/contest.js');

var KEY = require('./key');
var Settings = require('../settings');
var Logic = require('../logic');
var Comm = require('../comm');
var ERR = Comm.ERR;
var FailRender = Comm.FailRender;

/*
 * Standings页面
 */
router.get('/', function(req, res){
  var name = req.session.user ? req.session.user.name : '';
  var page = parseInt(req.query.page, 10);
  if (!page) {
    page = 1;
  }
  var cid = parseInt(req.query.cid, 10);
  if (!cid) {
    cid = 0;
  }
  var cond1 = {}, cond2 = {};
  var search = Comm.clearSpace(req.query.search);
  if (search) {
    cond1.name = cond2.nick = new RegExp("^.*"+Comm.toEscape(search)+".*$", 'i');
  }
  var cond = {$or: [cond1, cond2], name: {$ne: 'admin'}};
  var resp = {
    title: 'Standings',
    key: KEY.STANDINGS,
    page: page,
    pageNum: Settings.standings_pageNum,
    search: search,
    cid: cid
  };
  var ret = ERR.SYS;
  Q.fcall(function(){
    if (page < 0) {
      ret = ERR.REDIRECT;
      throw new Error('redirect');
    }
    return Contest.watch(cid);
  })
  .then(function(contest){
    if (contest && contest.type === 2) {
      cond.name = {$in: con.contestants};
    }
    return [
      User.get(cond, {rating: -1, name: 1}, page, resp.pageNum),
      name && name !== 'admin' ? User.watch(name) : null
    ];
  })
  .spread(function(o, user){
    resp.totalPage = o.totalPage;
    resp.users = o.users;
    resp.UC = {};
    resp.UT = {};
    o.users.forEach(function(p, i){
      resp.UC[p.name] = Comm.userCol(p.rating);
      resp.UT[p.name] = Comm.userTit(p.rating);
    });
    if (user && !search && !cid) {
      resp.UC[user.name] = Comm.userCol(user.rating);
      resp.UT[user.name] = Comm.userTit(user.rating);
      return Logic.GetRatingBeforeCount(user)
      .then(function(cnt){
        res.locals.user = user;
        res.locals.user.rank = cnt + 1;
        res.render('standings', resp);
      });
    } else {
      res.render('standings', resp);
    }
  })
  .fail(function(err){
    if (ret === ERR.REDIRECT) {
      return res.redirect('/standings');
    }
    FailRender(err, res, ret);
  })
  .done();
});

module.exports = router;
