
var Q = require('q');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Settings = require('../settings');
var pageNum = Settings.status_pageNum;

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

Solution.prototype.save = function() {
  var d = Q.defer();
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
      d.reject(err);
    } else {
      d.resolve();
    }
  });
  return d.promise;
};

Solution.find = function(cond) {
  var d = Q.defer();
  solutions.find(cond, function(err, docs){
    if (err) {
      d.reject(err);
    } else {
      d.resolve(docs);
    }
  });
  return d.promise;
};

Solution.findOneBySort = function(cond, sort_cond) {
  var d = Q.defer();
  solutions.findOne(cond).sort(sort_cond).exec(function(err, doc){
    if (err) {
      d.reject(err);
    } else {
      d.resolve(doc);
    }
  });
  return d.promise;
};

Solution.get = function(cond, page) {
  var d = Q.defer();
  solutions.count(cond, function(err, count) {
    if ((page-1)*pageNum > count) {
      return d.resolve({
        solutions: [],
        totalPage: 1
      });
    }
    solutions.find(cond).sort({runID: -1}).skip((page-1)*pageNum).limit(pageNum)
    .exec(function(err, docs){
      if (err) {
        d.reject(err);
      } else {
        d.resolve({
          solutions: docs,
          totalPage: Math.floor((count+pageNum-1)/pageNum)
        });
      }
    });
  });
  return d.promise;
};

Solution.distinct = function(key, cond) {
  var d = Q.defer();
  solutions.distinct(key, cond, function(err, docs){
    if (err) {
      d.reject(err);
    } else {
      d.resolve(docs);
    }
  });
  return d.promise;
};

Solution.update = function(cond, val) {
  var d = Q.defer();
  solutions.update(cond, val, {multi: true}, function(err){
    if (err) {
      d.reject(err);
    } else {
      d.resolve();
    }
  });
  return d.promise;
};

Solution.findOne = function(cond) {
  var d = Q.defer();
  solutions.findOne(cond, function(err, doc){
    if (err) {
      d.reject(err);
    } else {
      d.resolve(doc);
    }
  });
  return d.promise;
};

Solution.mapReduce = function(opt) {
  var d = Q.defer();
  solutions.mapReduce(opt, function(err, docs){
    if (err) {
      d.reject(err);
    } else {
      d.resolve(docs);
    }
  });
  return d.promise;
};

Solution.aggregate = function(opt) {
  var d = Q.defer();
  solutions.aggregate(opt, function(err, docs){
    if (err) {
      d.reject(err);
    } else {
      d.resolve(docs);
    }
  });
  return d.promise;
};

Solution.count = function(cond) {
  var d = Q.defer();
  solutions.count(cond, function(err, cnt){
    if (err) {
      d.reject(err);
    } else {
      d.resolve(cnt);
    }
  });
  return d.promise;
};

Solution.findOneAndUpdate = function(cond, val) {
  var d = Q.defer();
  solutions.findOneAndUpdate(cond, val, function(err, doc){
    if (err) {
      d.reject(err);
    } else {
      d.resolve(doc);
    }
  });
  return d.promise;
};
