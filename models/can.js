var Canvas = require('canvas');

var getRandom = function(start, end){
    return start+Math.random()*(end-start);
};

var rand = function(a, b) {
    return Math.round(Math.random() * (b - a)) + a;
}

exports.Can = function (callback) {
    var W = 90, H = 30
    ,   canvas = new Canvas(W, H)
    ,   ctx = canvas.getContext('2d')
    ,   items = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPRSTUVWXYZ23456789'.split('')
    ,   vcode = '';

    ctx.fillStyle = '#f3fbfe';
    ctx.fillRect(0, 0, 90, 30);
    ctx.globalAlpha = .8;
    ctx.font = '15px sans-serif';

    for (var i = 0; i < 10; i++) {
        ctx.fillStyle = 'rgb('+rand(150, 225)+','+rand(150, 225)+','+rand(150, 225)+')';
        for (var j = 0; j < 5; j++) {
            ctx.fillText(items[rand(0, items.length-1)], getRandom(-10, W+10), getRandom(-10, H+10));
        }
    }

    var color = 'rgb('+rand(1, 120)+','+rand(1, 120)+','+rand(1, 120)+')';
    ctx.font = 'bold 30px sans-serif';
    for (var i = 0; i < 4; i++) {
        var j = rand(0, items.length-1);
        ctx.fillStyle = color;
        ctx.fillText(items[j], 5 + i*23, 25);
        var a = getRandom(0.85, 0.95)
        ,   b = getRandom(-0.04, 0.04)
        ,   c = getRandom(-0.3, 0.3)
        ,   d = getRandom(0.85, 1.0);
        ctx.transform(a, b, c, d, 0, 0);
        vcode += items[j];
    }

    ctx.beginPath();
    ctx.strokeStyle = color;
    var A = getRandom(10, H/2)
    ,   b = getRandom(H/4, 3*H/4)
    ,   f = getRandom(H/4, 3*H/4)
    ,   T = getRandom(H*1.5, W)
    ,   w = 2*Math.PI / T;
    var S = function(x) {
        return A*Math.sin(w*x+f)+b;
    }
    ctx.lineWidth = 5;
    for (var x = -20; x < 200; x += 4) {
        ctx.moveTo(x, S(x));
        ctx.lineTo(x + 3, S(x+3));
    }
    ctx.closePath();
    ctx.stroke();

    return callback(vcode.toLowerCase(), '<img src="'+canvas.toDataURL()+'"/>');
};