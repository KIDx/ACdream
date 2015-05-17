
var Q = require('q');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Settings = require('../settings');
var pageNum = Settings.problemset_pageNum;

function Problem(problem) {
  this.problemID = problem.problemID;
  this.manager = problem.manager;
}

module.exports = Problem;

var problemObj = new Schema({
  problemID: {type: Number, index: {unique: true}},
  title: String,
  description: String,
  input: String,
  output: String,
  sampleInput: String,
  sampleOutput: String,
  hint: String,
  source: String,
  spj: Number,
  AC: Number,
  submit: Number,
  timeLimit: Number,
  memoryLimit: Number,
  hide: Boolean,
  tags: Array,
  manager: String,
  TC: Boolean,
  lastmodified: Number
});

mongoose.model('problems', problemObj);
var problems = mongoose.model('problems');

function InitProblem(problem) {
  problem.title = 'NULL';
  problem.description = '';
  problem.input = '';
  problem.output = '';
  problem.sampleInput = '';
  problem.sampleOutput = '';
  problem.hint = '';
  problem.spj = 0;
  problem.AC = 0;
  problem.submit = 0;
  problem.timeLimit = 1000;
  problem.memoryLimit = 64000;
  problem.hide = true;
  problem.TC = false;
  problem.lastmodified = (new Date()).getTime();
  problem.tags = new Array();
};

Problem.prototype.save = function() {
  var d = Q.defer();
  problem = new problems();
  InitProblem(problem);
  problem.problemID = this.problemID;
  if (this.manager) {
    problem.manager = this.manager;
  }
  problem.source = '';
  problem.save(function(err){
    if (err) {
      d.reject(err);
    } else {
      d.resolve();
    }
  });
  return d.promise;
};

Problem.create = function(docs) {
  docs.forEach(function(p){
    InitProblem(p);
  });
  var d = Q.defer();
  if (docs.length == 0) {
    d.resolve();
  } else {
    problems.create(docs, function(err){
      if (err) {
        d.reject(err);
      } else {
        d.resolve();
      }
    });
  }
  return d.promise;
};

Problem.find = function(cond) {
  var d = Q.defer();
  problems.find(cond, function(err, docs){
    if (err) {
      d.reject(err);
    } else {
      d.resolve(docs);
    }
  });
  return d.promise;
};

Problem.get = function(cond, page) {
  var d = Q.defer();
  problems.count(cond, function(err, count){
    if ((page-1)*pageNum > count) {
      return d.resolve({
        problems: [],
        totalPage: 1
      });
    }
    problems.find(cond).sort({problemID:1}).skip((page-1)*pageNum).limit(pageNum)
      .exec(function(err, docs){
      if (err) {
        d.reject(err);
      } else {
        d.resolve({
          problems: docs,
          totalPage: Math.floor((count+pageNum-1)/pageNum)
        });
      }
    });
  });
  return d.promise;
};

Problem.watch = function(pid) {
  var d = Q.defer();
  problems.findOne({problemID: pid}, function(err, doc) {
    if (err) {
      d.reject(err);
    } else {
      d.resolve(doc);
    }
  });
  return d.promise;
};

Problem.update = function(pid, val) {
  var d = Q.defer();
  problems.update({problemID: pid}, val, function(err){
    if (err) {
      d.reject(err);
    } else {
      d.resolve();
    }
  });
  return d.promise;
};

Problem.multiUpdate = function(cond, val) {
  var d = Q.defer();
  problems.update(cond, val, {multi:true}, function(err){
    if (err) {
      d.reject(err);
    } else {
      d.resolve();
    }
  });
  return d.promise;
};

Problem.distinct = function(key, cond) {
  var d = Q.defer();
  problems.distinct(key, cond, function(err, ary){
    if (err) {
      d.reject(err);
    } else {
      d.resolve(ary);
    }
  });
  return d.promise;
};
