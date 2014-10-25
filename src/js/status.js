$CE = $('.CE');
$(document).ready(function(){
  BindCE();
});

var $fil = $('#fil');
var $name = $('#name');
var $pid = $('#pid');
var $result = $('#result');
var $lang = $('#lang');
var $list = $('#list').find('a');

function go(page){
  var F = new Array(), G = new Array();
  var name = JudgeString($name.val());
  var pid = parseInt($pid.val(), 10);
  var result = JudgeString($result.val());
  var lang = JudgeString($lang.val());

  if (page) F.push('page'), G.push(page);
  if (name) F.push('name'), G.push(name);
  if (pid) F.push('pid'), G.push(pid);
  if (result) F.push('result'), G.push(result);
  if (lang) F.push('lang'), G.push(lang);

  var url = '/status', flg = true;
  for (var i = 0; i < F.length; i++) {
    if (flg) {
      url += '?';
      flg = false;
    } else {
      url += '&';
    }
    url += F[i] + '=' + G[i];
  }

  window.location.href = url;
}

$(document).ready(function(){
  $.each($list, function(i, p){
    $(p).click(function(){
      var $li = $(this).parent();
      if ($li.hasClass('active') || $li.hasClass('disabled')) {
        return false;
      }
      go($(this).attr('id'));
    });
  });
  $fil.click(function(){
    go(null);
  });
  simulateClick($name, $fil);
  simulateClick($pid, $fil);
});

$(document).ready(function(){
  getStatus();
});
