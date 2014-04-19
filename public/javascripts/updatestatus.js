//update status

var flg = {};

function updateStatus($p) {
	$.ajax({
		type: 'POST',
		url: '/updateStatus',
		dataType: 'json',
		data: {
			rid : $p.attr('rid')
		},
		timeout: 5000
	}).done(function(sol){
		if (sol) {
			if (sol.result == 8 && (sol.userName == current_user || current_user == 'admin')) {
				$p.removeClass()
				.addClass('bold')
				.html('<a href="javascript:;" title="more information" rid="'+$p.attr('rid')+'" class="CE special-text">Compilation Error</a>');
				BindCE();
			} else {
				if (sol.result == 1 && $p.text() != 'Running...') {
					$p.next().html('<img src="/img/running.gif" style="width:16px;height:16px;" />');
				}
				$p.removeClass()
				.addClass('bold')
				.addClass(Col(sol.result))
				.text(Res(sol.result));
				if (sol.result < 2) {
					setTimeout(function(){
						if (flg[$p.attr('rid')])
							updateStatus($p);
					}, 250);
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
		}
	});
}

function getStatus() {
	$verdict = $('#statustable td.unknow');
	if ($verdict.length) {
		$.each($verdict, function(i, p){
			flg[$(p).attr('rid')] = true;
			updateStatus($(p));
		});
	}
}