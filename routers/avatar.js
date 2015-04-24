
var router = require('express').Router();
var fs = require('fs');
var Q = require('q');

var User = require('../models/user.js');

var KEY = require('./key');
var Settings = require('../settings');
var Logic = require('../logic');
var Comm = require('../comm');
var ERR = Comm.ERR;
var FailRender = Comm.FailRender;
var FailProcess = Comm.FailProcess;

/*
 * 修改头像的页面
 */
router.get('/', function(req, res) {
  var ret = ERR.SYS;
  Q.fcall(function(){
    if (!req.session.user) {
      ret = ERR.INVALID_SESSION;
      throw new Error('invalid session.');
    }
    res.render('avatar', {
      title: 'Avatar Setting',
      key: KEY.AVATAR
    });
  })
  .fail(function(err){
    FailRender(err, res, ret);
  });
});

/*
 * 上传头像
 */
router.post('/upload', function(req, res) {
  var name = req.session.user ? req.session.user.name : '';
  var pre, path, sz, imgType;
  var ret = ERR.SYS;
  Q.fcall(function(){
    if (!name) {
      ret = ERR.INVALID_SESSION;
      throw new Error('invalid session.');
    }
    if (!req.files || !req.files.img || !req.files.img.mimetype) {
      ret = ERR.ARGS;
      throw new Error('invalid args.');
    }
    sz = req.files.img.size;
    if (sz > 2*1024*1024) {
      return RP('1');
    }
    path = req.files.img.path;
    var tmp = req.files.img.mimetype.split('/');
    if (tmp[0] !== 'image' || !Comm.CheckImageType(tmp[1])) {
      ret = ERR.ARGS;
      throw new Error('NOT supported format.');
    }
    imgType = tmp[1];
    pre = Settings.root_path + 'public/img/avatar/' + name;
    return Logic.MkDir(pre);
  })
  .then(function(){
    return [
      Logic.ResizeAndWriteImg(path, pre+'/1.'+imgType, 250, 250),
      Logic.ResizeAndWriteImg(path, pre+'/2.'+imgType, 150, 150),
      Logic.ResizeAndWriteImg(path, pre+'/3.'+imgType, 75, 75),
      Logic.ResizeAndWriteImg(path, pre+'/4.'+imgType, 50, 50)
    ];
  })
  .spread(function(){
    return User.update({name: name}, {imgType: imgType});
  })
  .then(function(){
    fs.unlink(path);
    req.session.user.imgType = imgType;
    req.session.msg = 'Your avatar has been updated successfully.';
    res.send({ret: ERR.OK});
  })
  .fail(function(err){
    if (path) {
      fs.unlink(path);
    }
    FailProcess(err, res, ret);
  })
  .done();
});

module.exports = router;
