
function addZero(n) {
    n = parseInt(n, 10);
    if (n != n) return '';
    return (n < 10 ? '0' : '')+n;
}

function getDate(s) {
    var date = s ? new Date(s) : new Date();
    if (!date) return '';
    return date.getFullYear()+'-'+addZero(date.getMonth()+1)+'-'+addZero(date.getDate())+' '+addZero(date.getHours())+':'+addZero(date.getMinutes())+':'+addZero(date.getSeconds());
}

var Tag = ['','2-sat','binary search','bitmasks','brute force','chinese remainder theorem',
'combinatorics','constructive algorithms','data structures',
'dfs and similar','divide and conquer','dp','dsu','expression parsing',
'fft','flows','games','geometry',
'graph matchings','graphs','greedy',
'hashing','implementation',
'math','matrices',
'meet-in-the-middle', 'number theory', 'probabilities',
'schedules','shortest paths', 'sortings',
'string suffix structures', 'strings',
'ternary search', 'trees', 'two pointers'];

var ProTil = ['','2-satisfiability','Binary search','Bitmasks','Brute force','Сhinese remainder theorem',
'Combinatorics','Constructive algorithms', 'Heaps, binary search trees, segment trees, hash tables, etc',
'Dfs and similar','Divide and Conquer','Dynamic programming','Disjoint set union','Parsing expression grammar',
'Fast Fourier transform','Graph network flows','Games, Sprague–Grundy theorem','Geometry, computational geometry',
'Graph matchings, König\'s theorem, vertex cover of bipartite graph','Graphs','Greedy algorithms',
'Hashing, hashtables','Implementation problems, programming technics, simulation',
'Mathematics including integration, differential equations, etc','Matrix multiplication, determinant, Cramer\'s rule, systems of linear equations',
'Meet-in-the-middle','Number theory: Euler function, GCD, divisibility, etc','Probabilities, expected values, statistics, random variables, etc',
'Scheduling Algorithms','Shortest paths on weighted and unweighted graphs','Sortings, orderings',
'Suffix arrays, suffix trees, suffix automatas, etc', 'Prefix- and Z-functions, suffix structures, Knuth–Morris–Pratt algorithm, etc',
'Ternary search', 'Trees', 'Two pointers'];

var easy_tips = ['未设置', '神题', '金牌题', '银牌题', '铜牌题', '水题'];

var fs = require('fs')
,   errlog = fs.createWriteStream(__dirname+'/error.log', {flags: 'a'});

function getpos() {
  try {
    throw new Error();
  } catch(e) {
    return e.stack.split('\n')[3].split(process.cwd()+'/')[1].replace(')', '');
  }
}

module.exports = {
  outputErr: function(err) {
    console.log(err);
    errlog.write(getDate()+' ['+getpos()+']\n'+err+'\n\n');
  },
  addZero: addZero,
  getDate: getDate,
  cookie_secret: 'gzhu',
  dburl: 'mongodb://127.0.0.1:27017/acdream_db',
  problemset_pageNum 	: 50,
  status_pageNum		  : 20,
  ranklist_pageNum		: 20,
  contest_pageNum     : 20,
  regform_pageNum     : 20,
  stats_pageNum       : 20,
  contestRank_pageNum	: 50,
  topic_pageNum       : 15,
  comment_pageNum     : 20,
  root_path           : __dirname+'/',
  data_path           : __dirname+'/data/',
  T: Tag,
  P: ProTil,
  easy_tips: easy_tips,
  languages: ['', 'C', 'C++', 'Java'],
  C: function(n) {    //return status' color
    switch(n) {
      case 0:
      case 1: return 'info-text';
      case 2: return 'accept-text';
      case 3:
      case 4:
      case 5:
      case 6:
      case 7:
      case 9:
      case 10:
      case 11:
      case 12:
      case 15: return 'wrong-text';
      default: return 'special-text';
    }
  },
  R: function(n) {    //return status' result
    switch(n) {
      case 0: return 'Pending...';
      case 1: return 'Running...';
      case 2: return 'Accepted';
      case 3: return 'Presentation Error';
      case 4: return 'Time Limit Exceeded';
      case 5: return 'Memory Limit Exceeded';
      case 6: return 'Wrong Answer';
      case 7: return 'Output Limit Exceeded';
      case 8: return 'Compilation Error';
      case 13: return 'Dangerous Code';
      case 14: return 'System Error';
      default: return 'Runtime Error';
    }
  },
  UC: function(n) {   //return user color style
    n = parseInt(n, 10);
    if (!n) return 'unrated';
    if (n >= 2200) {
      return 'red';
    } else if (n >= 1900) {
      return 'orange';
    } else if (n >= 1700) {
      return 'violet';
    } else if (n >= 1500) {
      return 'blue';
    } else if (n >= 1200) {
      return 'green';
    }
    return 'black';
  },
  UT: function(n) {   //return user title
    n = parseInt(n, 10);
    if (!n) return 'Unrated';
    if (n >= 2600) {
      return 'International Grandmaster';
    } else if (n >= 2200) {
      return 'Grandmaster';
    } else if (n >= 2050) {
      return 'International Master';
    } else if (n >= 1900) {
      return 'Master';
    } else if (n >= 1700) {
      return 'Candidate Master';
    } else if (n >= 1500) {
      return 'Expert';
    } else if (n >= 1350) {
      return 'Specialist';
    } else if (n >= 1200) {
      return 'Pupil';
    }
    return 'Newbie';
  },
  xss_options: {
    whiteList : {
      a:      ['target', 'href', 'title', 'id', 'name'],
      blockquote: ['cite'],
      br:     [],
      caption:[],
      dd:     [],
      div:    ['style'],
      dl:     [],
      dt:     [],
      em:     [],
      font:   ['color', 'size', 'face'],
      footer: [],
      h1:     ['style'],
      h2:     ['style'],
      h3:     ['style'],
      header: [],
      hr:     [],
      i:      [],
      img:    ['style', 'src', 'alt'],
      li:     ['style'],
      ol:     [],
      p:      ['style'],
      pre:    ['style', 'class'],
      section:[],
      small:  [],
      span:   ['style', 'class'],
      strong: [],
      table:  ['style', 'class', 'cellpadding', 'cellspacing', 'summary', 'width', 'border', 'align', 'valign'],
      tbody:  ['align', 'valign'],
      td:     ['style', 'width', 'colspan', 'align', 'valign'],
      tfoot:  ['align', 'valign'],
      th:     ['width', 'colspan', 'align', 'valign', 'scope'],
      thead:  ['align', 'valign'],
      tr:     ['rowspan', 'align', 'valign'],
      ul:     []
    }
  }
};
