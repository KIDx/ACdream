
var router = require('express').Router();
var Q = require('q');

var User = require('../models/user.js');

var KEY = require('./key');
var Settings = require('../settings');
var Logic = require('../logic');
var Comm = require('../comm');
var ERR = Comm.ERR;
var FailRender = Comm.FailRender;

/*
 * Ranklist页面
 */
router.get('/', function(req, res) {
  var name = req.session.user ? req.session.user.name : '';
  var page = parseInt(req.query.page, 10);
  if (!page) {
    page = 1;
  }
  var search = Comm.clearSpace(req.query.search);
  var resp = {
    title: 'Ranklist',
    key: KEY.RANKLIST,
    page: page,
    pageNum: Settings.ranklist_pageNum,
    search: search
  };
  var ret = ERR.SYS;
  Q.fcall(function(){
    if (page < 0) {
      ret = ERR.REDIRECT;
      throw new Error('redirect.');
    }
    var cond1 = {}, cond2 = {};
    if (search) {
      cond1.name = cond2.nick = new RegExp("^.*"+Comm.toEscape(search)+".*$", 'i');
    }
    var cond = {$or: [cond1, cond2], name: {$ne: 'admin'}};
    return [
      User.get(cond, {solved: -1, submit: 1, name: 1}, page, resp.pageNum),
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
    if (user && !search) {
      resp.UC[user.name] = Comm.userCol(user.rating);
      resp.UT[user.name] = Comm.userTit(user.rating);
      return Logic.GetRankBeforeCount(user)
      .then(function(cnt){
        res.locals.user = user;
        res.locals.user.rank = cnt + 1;
        res.render('ranklist', resp);
      });
    } else {
      res.render('ranklist', resp);
    }
  })
  .fail(function(err){
    if (ret === ERR.REDIRECT) {
      return res.redirect('/ranklist');
    }
    FailRender(err, res, ret);
  })
  .done();
});

module.exports = router;
