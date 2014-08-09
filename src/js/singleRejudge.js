var singleRejudgeBtn = '<div style="position:relative;"><a href="javascript:;" title="rejudge" class="rejudge img_link"></a></div>';

function bindSingleRejudge($ps) {
  if (!$ps || !$ps.length) {
    return ;
  }
  $ps.click(function(){
    var $p = $(this);
    if ($p.hasClass('disabled')) {
      return false;
    }
    $p.addClass('disabled');
    var $td = $p.parent().parent();
    var rid = $td.attr('rid');
    $.ajax({
      type: 'POST',
      url: '/rejudge/single',
      data: {
        rid: rid
      },
      dataType: 'text',
      error: function() {
        $p.removeClass('disabled');
        ShowMessage('无法连接到服务器！');
      }
    }).done(function(res){
      if (!res) {
        ShowMessage('Solution '+rid+' has been Rejudged successfully!');
      } else if (res == '1') {
        window.location.reload(true);
        return ;
      } else if (res == '3') {
        ShowMessage('系统错误！');
      }
      $td.addClass('unknow');
      $p.unbind().remove();
      $td.text(Res(0));
      $td.next().html(pendingImg);
      getResult($td);
    });
  });
}

var $rejudge = $('a.rejudge');

$(document).ready(function(){
  bindSingleRejudge($rejudge);
});
