
var router = require('express').Router();
var fs = require('fs');

var IDs = require('../models/ids.js');
var Problem = require('../models/problem.js');
var User = require('../models/user.js');

var KEY = require('./key');
var Settings = require('../settings');
var root_path = Settings.root_path;
var data_path = Settings.data_path;
var Comm = require('../comm');
var escapeHtml = Comm.escapeHtml;
var clearSpace = Comm.clearSpace;
var LogErr = Comm.LogErr;

/*
 * all: 验证登录态
 * get: addproblem页面
 * post: 增加或修改一个problem
 */
router.route('/')
.all(function(req, res, nxt){
  if (!req.session.user) {
    req.session.msg = 'Please login first!';
    return res.redirect('/');
  }
  if (!req.session.user.addprob) {
    req.session.msg = 'You have no permission to Add or Edit problem!';
    return res.redirect('/');
  }
  nxt();
})
.get(function(req, res){
  var pid = parseInt(req.query.pID, 10);
  var RP = function(P, F, I, K) {
    if (P) {
      P.description = escapeHtml(P.description);
      P.input = escapeHtml(P.input);
      P.output = escapeHtml(P.output);
      P.hint = escapeHtml(P.hint);
    }
    res.render('addproblem', {
      title: 'AddProblem',
      problem: P,
      key: K,
      files: F,
      imgs: I
    });
  };
  if (!pid) {
    return RP(null, null, null, KEY.ADD_PROBLEM);
  } else {
    Problem.watch(pid, function(err, problem){
      if (err) {
        LogErr(err);
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
      fs.readdir(root_path+'public/img/prob/'+pid, function(err, imgs){
        if (!imgs) {
          imgs = [];
        }
        fs.readdir(data_path+pid, function(err, files){
          if (!files) {
            files = [];
          }
          return RP(problem, files, imgs, KEY.EDIT_PROBLEM);
        });
      });
    });
  }
})
.post(function(req, res){
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
        LogErr(err);
        req.session.msg = '系统错误！';
        return res.redirect('/');
      }
      req.session.msg = 'Problem '+pid+' has been updated successfully!';
      return res.redirect('/problem?pid='+pid);
    });
  } else {
    IDs.get ('problemID', function(err, id) {
      if (err) {
        LogErr(err);
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
          LogErr(err);
          req.session.msg = '系统错误！';
          return res.redirect('/');
        }
        req.session.msg = 'Problem '+id+' has been created successfully!';
        return res.redirect('/addproblem?pID='+id);
      });
    });
  }
});

/*
 * 题目图片上传
 */
router.post('/imgUpload', function(req, res){
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
      LogErr(err);
      return RP('3');
    }
    if (!problem) {
      return RP();  //not allow
    }
    User.watch(req.session.user.name, function(err, user) {
      if (err) {
        LogErr(err);
        return RP('3');
      }
      if (!user || !user.addprob) {
        return RP(); //not allow
      }
      var pre = root_path+'public/img/prob/'+pid;
      fs.mkdir(pre, function(){
        fs.rename(path, pre+'/'+req.files.info.name, function(err){
          if (err) {
            LogErr(err);
            return RP('3');
          }
          return RP();
        });
      });
    });
  });
});

/*
 * 题目数据上传
 */
router.post('/dataUpload', function(req, res){
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
      LogErr(err);
      return RP('3');
    }
    if (!user || !user.addprob) {
      return RP();
    }
    fs.readFile(path, function(err, data){
      if (err) {
        LogErr(err);
        return RP('3');
      }
      fs.mkdir(data_path+pid, function(){
        fs.writeFile(data_path+pid+'/'+fname, String(data).replace(/\r/g, ''), function(err){
          if (err) {
            LogErr(err);
            return RP('3');
          }
          return RP();
        });
      });
    });
  });
});

/*
 * 删除一个数据文件
 */
router.post('/delData', function(req, res){
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
      LogErr(err);
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
});

/*
 * 删除一个图片
 */
router.post('/delImg', function(req, res){
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
      LogErr(err);
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
});

module.exports = router;
