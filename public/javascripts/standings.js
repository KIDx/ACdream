var cid = $('#standings').attr('cid');
var $fil = $('#fil');
var $search = $('#search');
var $list = $('#list').find('a');

function go(page){
  var F = new Array(), G = new Array();

  if (page) F.push('page'), G.push(page);
  if (cid) F.push('cid'), G.push(cid);

  if ($search.length) {
    var search = JudgeString($search.val());
    if (search) F.push('search'), G.push(search);
  }

  var url = '/standings', flg = true;
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
  if ($fil.length) {
    $fil.click(function(){
      go(null);
    });
    simulateClick($search, $fil);
  }
});