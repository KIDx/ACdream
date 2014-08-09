//update status

var flg = {};
var runningImg = '<img src="/img/running.gif" style="width:16px;height:16px;">';
var pendingImg = '<img src="/img/pending.gif" style="width:16px;height:16px;">';

function updateStatus($p) {
  $.ajax({
    type: 'POST',
    url: '/status/info',
    dataType: 'json',
    data: {
      rid: $p.attr('rid')
    },
    timeout: 5000
  }).done(function(sol){
    if (sol) {
      if (sol.result == 8 && (sol.userName == current_user || current_user == 'admin')) {
        $p.removeClass()
          .addClass('bold')
          .html('<a href="javascript:;" title="more information" rid="'
            + $p.attr('rid') + '" class="CE special-text">Compilation Error</a>');
        BindCE();
      } else {
        if (sol.result == 1 && $p.text() != 'Running...') {
          $p.next().html(runningImg);
        }
        $p.removeClass()
          .addClass('bold')
          .addClass(Col(sol.result))
          .text(Res(sol.result));
        if (sol.result < 2) {
          setTimeout(function(){
            if (flg[$p.attr('rid')])
              updateStatus($p);
          }, 1000);
        }
      }
      if (sol.result > 1) {
        if (sol.time != '---') {
          sol.time += ' MS';
          sol.memory += ' KB';
        }
        $p.next().text(sol.time);
        $p.next().next().text(sol.memory);
      }
      if (current_user == 'admin' && sol.result > 2) {
        $p.append(singleRejudgeBtn);
        bindSingleRejudge($p.find('a.rejudge'));
      }
    }
  });
}

function getResult($p) {
  flg[$p.attr('rid')] = true;
  updateStatus($p);
}

function getStatus() {
  $verdict = $('#statustable td.unknow');
  if ($verdict.length) {
    $.each($verdict, function(i, p){
      getResult($(p));
    });
  }
}
