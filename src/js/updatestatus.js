//update status

var rid_list = [];
var get_result_timeout;
var runningImg = '<img src="/img/running.gif" style="width:16px;height:16px;">';
var pendingImg = '<img src="/img/pending.gif" style="width:16px;height:16px;">';

function clearGetStatus() {
  rid_list = [];
  clearTimeout(get_result_timeout);
}

function getStatus() {
  var $verdict = $('#statustable td.unknow');
  if ($verdict.length) {
    var done = {};
    $.each($verdict, function(i, p){
      rid_list.push($(p).attr('rid'));
    });

    function updateStatus($p, sol) {
      if (sol) {
        if (sol.result >= 2) {
          done[$p.attr('rid')] = true;
        }
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
    }

    function getResult() {
      $.ajax({
        type: 'POST',
        url: '/status/batchresult',
        dataType: 'json',
        data: {
          rid_list: rid_list
        },
        timeout: 5000
      }).done(function(sols){
        if (sols) {
          $.each($verdict, function(i, p){
            updateStatus($(p), sols[$(p).attr('rid')]);
          });
        }
      });
      var todo_rid_list = [];
      $.each(rid_list, function(i, rid){
        if (!done[rid]) {
          todo_rid_list.push(rid);
        }
      });
      rid_list = todo_rid_list;
      if (rid_list.length) {
        get_result_timeout = setTimeout(getResult, 1000);
      }
    }
    getResult();
  }
}
