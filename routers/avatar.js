
var router = require('express').Router();
var fs = require('fs');
var gm = require('gm').subClass({ imageMagick : true });
var exec = require('child_process').exec;

var User = require('../models/user.js');

var KEY = require('./key');
var Settings = require('../settings');
var Comm = require('../comm');
var LogErr = Comm.LogErr;

/*
 * 修改头像的页面
 */
router.get('/', function(req, res) {
  if (!req.session.user) {
    req.session.msg = 'Please login first!';
    return res.redirect('/');
  }
  res.render('avatar', {
    title: 'Avatar Setting',
    key: KEY.AVATAR
  });
});

/*
 * 上传头像
 */
router.post('/upload', function(req, res) {
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
  var pre = Settings.root_path+'public/img/avatar/' + req.session.user.name;
  var originImg = gm(path);
  exec('rm -rf '+pre, function(err){
    if (err) {
      LogErr(err);
      return RP('3');
    }
    fs.mkdir(pre, function(err){
      if (err) {
        LogErr(err);
        return RP('3');
      }
      originImg.resize(250, 250, '!')
      .autoOrient()
      .write(pre+'/1.'+imgType, function(err){
        if (err) {
          LogErr(err);
          return RP('3');
        }
        originImg.resize(150, 150, '!')
        .autoOrient()
        .write(pre+'/2.'+imgType, function(err){
          if (err) {
            LogErr(err);
            return RP('3');
          }
          originImg.resize(75, 75, '!')
          .autoOrient()
          .write(pre+'/3.'+imgType, function(err){
            if (err) {
              LogErr(err);
              return RP('3');
            }
            originImg.resize(50, 50, '!')
            .autoOrient()
            .write(pre+'/4.'+imgType, function(err){
              if (err) {
                LogErr(err);
                return RP('3');
              }
              req.session.msg = '头像修改成功！';
              if (req.session.user.imgType == imgType) {
                return RP();
              }
              req.session.user.imgType = imgType;
              User.update({name: req.session.user.name}, {imgType: imgType}, function(err){
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
    });
  });
});

module.exports = router;
