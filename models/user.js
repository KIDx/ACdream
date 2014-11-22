
var Q = require('q');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Comm = require('../comm');
var LogErr = Comm.LogErr;

function User(user) {
  this.name = user.name;
  this.password = user.password;
  this.regTime = user.regTime;
  this.nick = user.nick;
  this.school = user.school;
  this.email = user.email;
  this.signature = user.signature;
  this.rating = user.rating;
}

module.exports = User;

var userObj = new Schema({
  name: {type: String, index: {unique: true}},
  password: String,
  visTime: Number,
  token: String,
  regTime: Number,
  nick: String,
  school: String,
  email: String,
  signature: String,

  submit: Number,
  solved: Number,
  rating: Number,
  ratedRecord: Array,
  lastRatedContest: Number,

  addprob: Boolean,
  imgType: String
});

userObj.index({rating: -1, name: 1});
userObj.index({solved: -1, submit: 1, name: 1});

mongoose.model('users', userObj);
var users = mongoose.model('users');

User.prototype.save = function(callback) {
  user = new users();
  user.name = this.name;
  user.password = this.password;
  user.visTime = user.regTime = this.regTime;
  user.nick = this.nick;
  user.school = this.school;
  user.email = this.email;
  user.signature = this.signature;
  user.submit = 0;
  user.solved = 0;
  user.rating = 0;
  user.ratedRecord = new Array();
  user.addprob = false;
  user.save(function(err){
    if (err) {
      LogErr('User.save failed!');
    }
    return callback(err, user);
  });
};

User.watch = function(username, callback) {
  users.findOne({name: username}, function(err, doc){
    if (err) {
      LogErr('User.watch failed!');
    }
    return callback(err, doc);
  });
};

User.distinct = function(key, cond, callback) {
  users.distinct(key, cond, function(err, docs){
    if (err) {
      LogErr('User.distinct failed!');
    }
    return callback(err, docs);
  });
};

User.findOne = function(cond, callback){
  users.findOne(cond, function(err, docs){
    if (err) {
      LogErr('User.findOne failed!');
    }
    return callback(err, docs);
  });
};

User.find = function(cond, callback){
  users.find(cond, function(err, docs){
    if (err) {
      LogErr('User.find failed!');
    }
    return callback(err, docs);
  });
};

User.qfind = function(cond){
  var d = Q.defer();
  users.find(cond, function(err, docs){
    if (err) {
      d.reject(err);
    } else {
      d.resolve(docs);
    }
  });
  return d.promise;
};

User.get = function(cond, sq, page, pageNum, callback) {
  users.count(cond, function(err, count){
    if ((page-1)*pageNum > count) {
      return callback(null, null, -1);
    }
    users.find(cond).sort(sq).skip((page-1)*pageNum).limit(pageNum)
      .exec(function(err, docs){
      if (err) {
        LogErr('User.get failed!');
      }
      return callback(err, docs, parseInt((count+pageNum-1)/pageNum, 10));
    });
  });
};

User.topTen = function(cond) {
  var d = Q.defer();
  users.find(cond).sort({rating: -1, name: 1}).limit(10).exec(function(err, docs){
    if (err) {
      d.reject(err);
    } else {
      d.resolve(docs);
    }
  });
  return d.promise;
};

User.count = function(cond, callback) {
  users.count(cond, function(err, count){
    if (err) {
      LogErr('User.count failed!');
    }
    return callback(err, count);
  });
};

User.update = function(cond, H, callback) {
  users.update(cond, H, function(err){
    if (err) {
      LogErr('User.update failed!');
    }
    return callback(err);
  });
};

User.multiUpdate = function(cond, H, callback) {
  users.update(cond, H, { multi: true }, function(err){
    if (err) {
      LogErr('User.multiUpdate failed!');
    }
    return callback(err);
  });
};
