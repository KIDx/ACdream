
CKEDITOR.plugins.add('smiley', {
    requires: 'dialog',
    init: function(a) {
        a.config.smiley_path = a.config.smiley_path || ( this.path + 'images/' );
        a.addCommand('smiley', new CKEDITOR.dialogCommand('smiley', {
            allowedContent: 'img[alt,height,!src,title,width]',
            requiredContent: 'img'
        }));
        a.ui.addButton && a.ui.addButton('Smiley', {
            label: a.lang.smiley.toolbar,
            command: 'smiley',
            icon: this.path + 'face.png'
        });
        CKEDITOR.dialog.add('smiley', this.path + 'dialogs/smiley.js' );
    }
});