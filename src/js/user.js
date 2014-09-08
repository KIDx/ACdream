var name = $('#user').attr('name');
var $ap = $('#addprob');

$(document).ready(function(){
  if ($ap.length) {
    $ap.click(function(){
      if ($ap.hasClass('disabled')) {
        return false;
      }
      $ap.addClass('disabled');
      $.ajax({
        type: 'POST',
        url: '/user/changeAddprob',
        data: { name : name },
        dataType: 'text',
        error: function() {
          $ap.removeClass('disabled');
          ShowMessage('无法连接到服务器！');
        }
      }).done(function(){
        window.location.reload(true);
      });
    });
  }
});

var $recal = $('#recal');

$(document).ready(function(){
  if ($recal.length) {
    $recal.click(function(){
      if ($(this).hasClass('disabled')) {
        return false;
      }
      $recal.text('处理中...').addClass('disabled');
      $.ajax({
        type: 'POST',
        url: '/admin/stat',
        data: { name : name },
        dataType: 'text',
        error: function() {
          $recal.text('重新统计所有用户提交数和AC数').removeClass('disabled');
          ShowMessage('无法连接到服务器！');
        }
      }).done(function(res){
        window.location.href = '/ranklist';
      });
    });
  }
});

var $restore = $('#restore');

$(document).ready(function(){
  if ($restore.length) {
    $restore.click(function(){
      if ($(this).hasClass('disabled')) {
        return false;
      }
      if (!confirm('确认要把'+name+'的密码恢复为"123456"吗？')) {
        return false;
      }
      $restore.addClass('disabled');
      $.ajax({
        type: 'POST',
        url: '/user/restorePsw',
        data: { name : name },
        dataType: 'text',
        error: function() {
          $restore.removeClass('disabled');
          ShowMessage('无法连接到服务器！');
        }
      }).done(function(){
        window.location.reload(true);
      });
    });
  }
});

var $dialog_st = $('div#dialog_st');

$(document).ready(function(){
  //settings
  if ($dialog_st.length > 0) {
    var $setinput = $dialog_st.find('input');
    var $seterr = $dialog_st.find('small#set_error');
    var $setsubmit = $dialog_st.find('#set_submit');

    $dialog_st.jqm({
      overlay: 30,
      trigger: $('a#set'),
      modal: true,
      closeClass: 'setclose',
      onShow: function(h) {
        h.o.fadeIn(200);
        h.w.fadeIn(200);
      },
      onHide: function(h) {
        h.w.fadeOut(200);
        h.o.fadeOut(200);
      }
    }).jqDrag('.jqDrag').jqResize('.jqResize');

    $setsubmit.click(function(){
      if ($(this).hasClass('disabled')) {
        return false;
      }
      var oldpassword = $setinput.eq(0).val();
      if (!oldpassword) {
        errAnimate($seterr, 'Old Password can not be empty!');
        return false;
      }
      var password = $setinput.eq(1).val();
      var repeat = $setinput.eq(2).val();
      if (repeat != password) {
        errAnimate($seterr, 'Two New Passwords are not the same!');
        return false;
      }
      if (password == oldpassword) {
        errAnimate($seterr, 'New Password should not be the same as the old one!');
        return false;
      }
      var nick = JudgeString($setinput.eq(3).val());
      if (!nick) {
        errAnimate($seterr, 'Nick Name can not be empty!');
        return false;
      }
      if (nick.length > 20) {
        errAnimate($seterr, 'The length of Nick Name should be no more than 20!');
        return false;
      }
      var school = JudgeString($setinput.eq(4).val());
      if (school.length > 50) {
        errAnimate($seterr, 'the length of school should be no more than 50!');
        return false;
      }
      var email = $setinput.eq(5).val();
      if (email) {
        pattern = new RegExp("^([a-zA-Z0-9]+[_|\_|\.]?)*[a-zA-Z0-9]+@([a-zA-Z0-9]+[_|\_|\.]?)*[a-zA-Z0-9]+\.[a-zA-Z]{2,4}$");
        if (!pattern.test(email)) {
          errAnimate($seterr, 'The format of Email is not True!');
          return false;
        }
      }
      if (email.length > 50) {
        errAnimate($seterr, 'the length of email should be no more than 50!');
        return false;
      }
      var signature = JudgeString($dialog_st.find('textarea').attr('value'));
      if (signature.length > 200) {
        errAnimate($seterr, 'the length of signature should be no more than 200!');
        return false;
      }
      $setsubmit.text('Submitting...').addClass('disabled');
      $.ajax({
        type: 'POST',
        url: '/user/changeInfo',
        data: {
          name: $dialog_st.attr('name'),
          oldpassword: oldpassword,
          password: password,
          nick: nick,
          school: school,
          email: email,
          signature: signature
        },
        dataType: 'text',
        error: function() {
          $setsubmit.text('Submit').removeClass('disabled');
          errAnimate($seterr, '无法连接到服务器！');
        }
      }).done(function(res){
        if (res) {
          errAnimate($seterr, 'The old password is NOT true!');
        } else {
          window.location.reload(true);
        }
        $setsubmit.text('Submit').removeClass('disabled');
      });
    });

    $setinput.keyup(function(e){
      if (e.keyCode == 13) {
        $setsubmit.click();
      }
      return false;
    });
  }
});

function DeltaSpan(x) {
  var html = ' (<span style="font-weight:bold;color:';
  if (x >= 0) {
    html += 'green">+';
  } else {
    html += 'red">';
  }
  html += x;
  html += '</span>). ';
  return html;
}

var $chart = $('#chart');

$(document).ready(function(){
  var data = new Array(), pre = 1500;
  for (var i = 0; i < ratedRecord.length; i++) {
    var p = ratedRecord[i];
    var rowOne = '<div>= '+p.rating+DeltaSpan(p.rating-pre)+UserTitle(p.rating)+'</div>';
    var rowTwo = '<div>Rank '+(p.rank+1)+'</div>';
    var rowThree = '<a target="_blank" href="/contest?cid='+p.cid+'">'+p.title+'</a>';
    data.push({ name: rowOne+rowTwo+rowThree, x: p.inDate, y: p.rating });
    pre = p.rating;
  }
  var colors = ['#cccccc', '#aaffaa', '#77ff77', '#aaabfe', '#ff8efe',
    '#fecc87', '#ffbb56', '#ff7777', '#ff3334'];
  var plotBands = new Array();
  var tickPositions = [pre=minRating-100, 1200, 1350, 1500, 1700, 1900,
    2050, 2200, 2600, 100000];
  for (var i = 1; i < tickPositions.length; i++) {
    var p = tickPositions[i];
    plotBands.push({ color: colors[i-1], from: pre, to: p });
    pre = p;
  }
  $chart.highcharts({
    exporting: {
      enabled: false
    },
    credits: {
      enabled: false
    },
    chart: {
      marginRight: 8,
      borderColor: '#EBBA95',
      borderRadius: 5,
      borderWidth: 2,
      type: 'line',
      height: 300,
      plotBorderWidth: 2,
      plotBorderColor: '#505050',
      backgroundColor: null
    },
    plotOptions: {
      series: {
        color: '#ffd146',
        shadow: true,
        marker: {
          fillColor: '#FFFFFF',
          lineWidth: 2,
          lineColor: null
        }
      },
      line: {
        events: {
          legendItemClick: function() {
            return false;
          }
        }
      }
    },
    title: {
      text: '',
    },
    xAxis: {
      tickWidth: 0,
      gridLineColor: 'rgba(50,50,50,0.2)',
      gridLineWidth: 1,
      tickPixelInterval: 100,
      type: 'datetime',
      dateTimeLabelFormats: {
        millisecond: '%e. %b',
        day: '%e. %b',
        week: '%e. %b',
        month: '%b %Y',
        year: '%Y'
      }
    },
    yAxis: {
      title: {
        text: ''
      },
      gridLineColor: 'rgba(50,50,50,0.2)',
      tickPositions: tickPositions,
      showFirstLabel: false,
      endOnTick: false,
      maxPadding: 1,
      plotBands: plotBands
    },
    tooltip: {
      backgroundColor: null,
      borderWidth: 0,
      shadow: false,
      useHTML: true,
      pointFormat: '',
      style: {
        fontFamily: '微软雅黑,Helvetica Neue,Helvetica,Arial,sans-serif'
      }
    },
    legend: {
      padding: 10,
      borderRadius: 0,
      borderWidth: 0,
      backgroundColor: 'rgba(255,255,255,0.6)',
      itemStyle: {
        color: '#333333',
        fontWeight: 'normal',
        cursor: 'text'
      },
      align: 'right',
      verticalAlign: 'top',
      x: -5,
      y: 5,
      title: '{name}'
    },
    series: [{
      name: name,
      data: data,
      pointStart: Date.UTC(2010, 1, 1),
    }]
  });
  var chart = $chart.highcharts();
  var y = chart.yAxis[0];
  if (y.getExtremes().dataMax+100 < 1950) {
    y.setExtremes(tickPositions[0], 1950);
  }
});
