
var mongoose = require('mongoose')
,   Schema = mongoose.Schema
,   settings = require('../settings')
,   pageNum = settings.ranklist_pageNum
,   OE = settings.outputErr;

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
  regTime: Number,
  nick: String,
  school: String,
  email: String,
  signature: String,

  submit: Number,
  solved: Number,
  rating: Number,

  addprob: Boolean,
  imgType: String
});

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
  addprob = false;
  user.save(function(err){
    if (err) {
      OE('User.save failed!');
    }
    return callback(err, user);
  });
};

User.watch = function(username, callback) {
  users.findOne({name:username}, function(err, doc){
    if (err) {
      OE('User.watch failed!');
    }
    return callback(err, doc);
  });
};

User.distinct = function(key, Q, callback) {
  users.distinct(key, Q, function(err, docs){
    if (err) {
      OE('User.distinct failed!');
    }
    return callback(err, docs);
  });
};

User.find = function(Q, callback){
  users.find(Q, function(err, docs){
    if (err) {
      OE('User.find failed!');
    }
    return callback(err, docs);
  });
};

User.get = function(Q, page, callback) {
  users.count(Q, function(err, count){
    if ((page-1)*pageNum > count) {
      return callback(null, null, -1);
    }
    users.find(Q).sort({solved:-1,submit:1,name:1}).skip((page-1)*pageNum).limit(pageNum).exec(function(err, docs){
      if (err) {
        OE('User.get failed!');
      }
      return callback(err, docs, parseInt((count+pageNum-1)/pageNum, 10));
    });
  });
};

User.count = function(Q, callback) {
  users.count(Q, function(err, count){
    if (err) {
      OE('User.count failed!');
    }
    return callback(err, count);
  });
};

User.update = function(Q, H, callback) {
  users.update(Q, H, function(err){
    if (err) {
      OE('User.update failed!');
    }
    return callback(err);
  });
};

User.multiUpdate = function(Q, H, callback) {
  users.update(Q, H, { multi: true }, function(err){
    if (err) {
      OE('User.multiUpdate failed!');
    }
    return callback(err);
  });
};