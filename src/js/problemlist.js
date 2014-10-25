var $fil = $('#fil');
var $search = $('#search');
var $list = $('#list').find('a');
var $tags = $('a.tag');

function go(page){
  var F = new Array(), G = new Array();
  var search = JudgeString($search.val());

  if (page) F.push('page'), G.push(page);
  if (search) F.push('search'), G.push(search);

  var url = '/problem/list', flg = true;
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
  $fil.click(function(){
    go(null);
  });
  $.each($list, function(i, p){
    $(p).click(function(){
      var $li = $(this).parent();
      if ($li.hasClass('active') || $li.hasClass('disabled')) {
        return false;
      }
      go($(this).attr('id'));
    });
  });
  $.each($tags, function(i, p){
    $(p).click(function(){
      $search.val($(this).text());
      go(null);
    });
  });
  simulateClick($search, $fil);
});
