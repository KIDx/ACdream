
CKEDITOR.plugins.add('insertcode', {
    requires: 'dialog',
    init: function(a){
        var b = a.addCommand('insertcode', new CKEDITOR.dialogCommand('insertcode'));
        a.ui.addButton && a.ui.addButton('InsertCode', {
            label: a.lang.insertcode,
            command: 'insertcode',
            icon: this.path + 'images/code.png'
        });
        CKEDITOR.dialog.add('insertcode', this.path + 'dialogs/insertcode.js');
    }
});