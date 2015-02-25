
var Q = require('q');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

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

User.prototype.save = function() {
  var d = Q.defer();
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
      d.reject(err);
    } else {
      d.resolve(user);
    }
  });
  return d.promise;
};

User.watch = function(username) {
  var d = Q.defer();
  users.findOne({name: username}, function(err, doc){
    if (err) {
      d.reject(err);
    } else {
      d.resolve(doc);
    }
  });
  return d.promise;
};

User.distinct = function(key, cond) {
  var d = Q.defer();
  users.distinct(key, cond, function(err, docs){
    if (err) {
      d.reject(err);
    } else {
      d.resolve(docs);
    }
  });
  return d.promise;
};

User.findOne = function(cond){
  var d = Q.defer();
  users.findOne(cond, function(err, doc){
    if (err) {
      d.reject(err);
    } else {
      d.resolve(doc);
    }
  });
  return d.promise;
};

User.find = function(cond){
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

User.get = function(cond, sq, page, pageNum) {
  var d = Q.defer();
  users.count(cond, function(err, count){
    if ((page-1)*pageNum > count) {
      return d.resolve({
        users: [],
        totalPage: 1
      });
    }
    users.find(cond).sort(sq).skip((page-1)*pageNum).limit(pageNum)
      .exec(function(err, docs){
      if (err) {
        d.reject(err);
      } else {
        d.resolve({
          users: docs,
          totalPage: Math.floor((count+pageNum-1)/pageNum)
        });
      }
    });
  });
  return d.promise;
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

User.count = function(cond) {
  var d = Q.defer();
  users.count(cond, function(err, cnt){
    if (err) {
      d.reject(err);
    } else {
      d.resolve(cnt);
    }
  });
  return d.promise;
};

User.update = function(cond, val) {
  var d = Q.defer();
  users.update(cond, val, function(err){
    if (err) {
      d.reject(err);
    } else {
      d.resolve();
    }
  });
  return d.promise;
};

User.update = function(cond, val) {
  var d = Q.defer();
  users.update(cond, val, function(err){
    if (err) {
      d.reject(err);
    } else {
      d.resolve();
    }
  });
  return d.promise;
};

User.findOneAndUpdate = function(cond, val) {
  var d = Q.defer();
  users.findOneAndUpdate(cond, val, function(err, doc){
    if (err) {
      d.reject(err);
    } else {
      d.resolve(doc);
    }
  });
  return d.promise;
};

User.multiUpdate = function(cond, val) {
  var d = Q.defer();
  users.update(cond, val, {multi: true}, function(err){
    if (err) {
      d.reject(err);
    } else {
      d.resolve();
    }
  });
  return d.promise;
};
