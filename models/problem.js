
var mongoose = require('mongoose')
,   Schema = mongoose.Schema
,   settings = require('../settings')
,   pageNum = settings.problemset_pageNum
,   OE = settings.outputErr;

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
  easy: Number,
  lastmodified: Number
});

mongoose.model('problems', problemObj);
var problems = mongoose.model('problems');

Problem.prototype.save = function(callback) {
  //存入 Mongodb 的文档
  problem = new problems();
  problem.problemID = this.problemID;
  problem.title = 'NULL';
  problem.description = '';
  problem.input = '';
  problem.output = '';
  problem.sampleInput = '';
  problem.sampleOutput = '';
  problem.hint = '';
  problem.source = '';
  problem.spj = 0;
  problem.AC = 0;
  problem.submit = 0;
  problem.timeLimit = 1000;
  problem.memoryLimit = 64000;
  problem.hide = false;
  problem.TC = false;
  problem.easy = 0;
  problem.lastmodified = (new Date()).getTime();
  if (this.manager) problem.manager = this.manager;
  problem.tags = new Array();

  problem.save(function(err){
    if (err) {
      OE('Problem.save failed!');
    }
    return callback(err);
  });
};

Problem.find = function(Q, callback) {
  problems.find(Q, function(err, docs){
    if (err) {
      OE('Problem.find failed!');
    }
    return callback(err, docs);
  });
};

Problem.get = function(Q, page, callback) {
  problems.count(Q, function(err, count){
    if ((page-1)*pageNum > count) {
      return callback(null, null, -1);
    }
    problems.find(Q).sort({problemID:1}).skip((page-1)*pageNum).limit(pageNum).exec(function(err, docs){
      if (err) {
        OE('Problem.get failed!');
      }
      return callback(err, docs, parseInt((count+pageNum-1)/pageNum, 10), count);
    });
  });
};

Problem.watch = function(pid, callback) {
  problems.findOne({problemID: pid}, function(err, doc) {
    if (err) {
      OE('Problem.watch failed!');
    }
    return callback(err, doc);
  });
};

Problem.update = function(pid, H, callback) {
  problems.update({problemID: pid}, H, function(err){
    if (err) {
      OE('Problem.update failed!');
    }
    return callback(err);
  });
};

Problem.multiUpdate = function(Q, H, callback) {
  problems.update(Q, H, {multi:true}, function(err){
    if (err) {
      OE('Problem.multiUpdate failed!');
    }
    return callback(err);
  });
};