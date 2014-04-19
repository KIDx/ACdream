var $sidebar = $('#sidebar')
,	$lang = $sidebar.find('#lang')
,	$file = $sidebar.find('#file')
,	$error = $sidebar.find('#error')
,	$submit = $sidebar.find('#submit')
,	$add_tag = $('#add-tag')
,	$selectdiv = $add_tag.prev()
,	$select = $selectdiv.find('select')
,	$del_tag = $('span.del')
,	$tag_box = $sidebar.find('div.tag-box')
,   $ui = $('#upload-info');

var pid = $sidebar.attr('pid');

$(document).ready(function() {
	$submit.click(function() {
		if (!$file.val()) {
			errAnimate($error, 'Choose file!');
			return false;
		}
	});
	$file.fileupload({
		dataType: 'text',
		add: function(e, data) {
			var f = data.files[0];
			$ui.text(f.name);
			$submit.unbind('click');
			$submit.click(function(){
				if (f.size) {
					if (f.size < 50) {
						errAnimate($error, 'too small! ( < 50B )');
						return false;
					} else if (f.size > 65535) {
						errAnimate($error, 'too large! ( > 65535B )');
						return false;
					}
				}
				$error.text('');
				data.submit();
			});
		},
		progress: function(e, data) {
			var p = parseInt(data.loaded/data.total*100, 10);
			$ui.text(p+'%');
		},
		done: function(e, data) {
			var res = data.response().result, tp;
			if (!res) window.location.href = '/status';
			else if (res == '1') tp = 'too small!(<50)';
			else if (res == '2') tp = 'too large!(>65535)';
			else if (res == '3') tp = '异常错误！';
			else if (res == '4') window.location.reload(true);
			else if (res == '5') tp = 'the language is not exit!';
			if (tp) {
				errAnimate($error, tp);
			}
		}
	});
	$file.bind('fileuploadsubmit', function(e, data){
		data.formData = { lang: $lang.val() };
	});
});

$(document).ready(function(){
	if ($add_tag.length) {
		$add_tag.unbind(); $del_tag.unbind();
		$add_tag.click(function(){
			$(this).addClass('hidden');
			$selectdiv.show();
			$select.change(function(res){
				$.post('/editTag', {tag:$(this).val(), pid:pid, add:true}, function(){
					window.location.reload(true);
				});
			});
		});
		$del_tag.click(function(){
			$.post('/editTag', {tag:$(this).attr('tag'), pid:pid}, function(){
				window.location.reload(true);
			});
		});
	}
});

var $rejudge = $('#rejudge');

$(document).ready(function(){
	if ($rejudge.length) {
		$rejudge.click(function(){
			$.post('/rejudge', {pid: pid}, function(){
				window.location.href = '/status?pid='+pid;
			})
		});
	}
});

var $phide = $('#phide')
,	$peasy = $('#peasy')
,	$star = $('#easy_star')
,	success_msg = 'Problem '+pid+' has been updated successfully!';

$(document).ready(function(){
	if ($phide.length) {
		$phide.change(function(){
			$.post('/toggleHide', {pid: pid}, function(res){
				if (res == '1') {
					ShowMessage('系统错误！');
				} else if (res == '2') {
					window.location.reload(true);
				} else {
					ShowMessage(success_msg);
				}
			});
		});
	}
	if ($peasy.length) {
		$peasy.change(function(){
			var e = $(this).val();
			$.post('/updateEasy', {pid: pid, easy: e}, function(res){
				if (res == '1') {
					ShowMessage('系统错误！');
				} else if (res == '2') {
					window.location.reload(true);
				} else {
					$star.css({width: e*16+'px'});
					ShowMessage(success_msg);
				}
			});
		});
	}
});