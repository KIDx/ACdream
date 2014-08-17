
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Settings = require('../settings');
var pageNum = Settings.status_pageNum;
var Comm = require('../comm');
var LogErr = Comm.LogErr;

function Solution(solution) {
  this.runID = solution.runID;
  this.problemID = solution.problemID;
  this.userName = solution.userName;
  this.inDate = solution.inDate;
  this.language = solution.language;
  this.length = solution.length;
  this.cID = solution.cID;
  this.code = solution.code;
}

module.exports = Solution;

var solutionObj = new Schema({
  runID: {type: Number, index: {unique: true}},
  problemID: Number,
  userName: String,
  inDate: Number,
  result: Number,
  language: Number,
  length: Number,
  time: Number,
  memory: Number,
  cID: Number,
  code: String,
  CE: String
});

solutionObj.index({result: 1});
solutionObj.index({userName: 1, runID: -1});
solutionObj.index({problemID: 1, runID: -1});
solutionObj.index({language: 1, runID: -1});
solutionObj.index({result: 1, runID: -1});

mongoose.model('solutions', solutionObj);
var solutions = mongoose.model('solutions');

Solution.prototype.save = function(callback) {
  //存入 Mongodb 的文档
  solution = new solutions();
  solution.runID = this.runID;
  solution.problemID = this.problemID;
  solution.userName = this.userName;
  solution.inDate = this.inDate;
  solution.result = 0;
  solution.language = this.language;
  solution.length = this.length;
  solution.time = 0;
  solution.memory = 0;
  solution.cID = this.cID;
  solution.code = this.code;
  solution.save(function(err){
    if (err) {
      LogErr('Solution.save failed!');
    }
    return callback(err);
  });
};

Solution.find = function(Q, callback) {
  solutions.find(Q, function(err, docs){
    if (err) {
      LogErr('Solution.find failed!');
    }
    return callback(err, docs);
  });
};

Solution.findOne = function(Q, sq, callback) {
  solutions.findOne(Q).sort(sq).exec(function(err, doc){
    if (err) {
      LogErr('Solution.findOne failed!');
    }
    return callback(err, doc);
  });
};

Solution.get = function(Q, page, callback) {
  solutions.count(Q, function(err, count) {
    if ((page-1)*pageNum > count) {
      return callback(null, null, -1);
    }
    solutions.find(Q).sort({runID:-1}).skip((page-1)*pageNum).limit(pageNum)
    .exec(function(err, docs){
      if (err) {
        LogErr('Solution.get failed!');
      }
      return callback(err, docs, parseInt((count+pageNum-1)/pageNum, 10));
    });
  });
};

Solution.distinct = function(key, Q, callback) {
  solutions.distinct(key, Q, function(err, docs){
    if (err) {
      LogErr('Solution.distinct failed!');
    }
    callback(err, docs);
  });
};

Solution.update = function(Q, H, callback) {
  solutions.update(Q, H, { multi:true }, function(err){
    if (err) {
      LogErr('Solution.update failed!');
    }
    return callback(err);
  });
};

Solution.watch = function(Q, callback) {
  solutions.findOne(Q, function(err, doc){
    if (err) {
      LogErr('Solution.watch failed!');
    }
    return callback(err, doc);
  });
};

Solution.mapReduce = function(o, callback) {
  solutions.mapReduce(o, function(err, docs){
    if (err) {
      LogErr('Solution.mapReduce failed!');
    }
    return callback(err, docs);
  });
};

Solution.aggregate = function(o, callback) {
  solutions.aggregate(o, function(err, docs){
    if (err) {
      LogErr('Solution.aggregate failed!');
    }
    return callback(err, docs);
  });
};

Solution.count = function(Q, callback) {
  solutions.count(Q, function(err, count){
    if (err) {
      LogErr('Solution.count failed!');
    }
    return callback(err, count);
  });
};

Solution.findOneAndUpdate = function(Q, H, callback) {
  solutions.findOneAndUpdate(Q, H, function(err, doc){
    if (err) {
      LogErr('Solution.findOneAndUpdate failed!');
    }
    return callback(err, doc);
  });
};
