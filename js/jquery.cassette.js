/**
 * Original information:
 * jquery.cxassette.js v1.0.0
 * http://www.codrops.com
 *
 * Licensed under the MIT license.
 * http://www.opensource.org/licenses/mit-license.php
 * 
 * Copyright 2012, Codrops
 * http://www.codrops.com
 */

//You only need to edit this url before you start to use.
var Podurl = 'http://magehack.html.xdomain.jp/podcast.xml';


// current side of the tape
var currentSide = 1;
// current time of playing side
var cntTime = 0;
// Current Position
var cntPosition;
// current sum of the duration of played songs 
var timeIterator = 0;
// used for rewind / forward
var elapsed = 0.0;
// Timer
var timertimeout;
// Seek
var isSeeking;
// canplay
var playable = false;
// action performed
var lastaction = '';
// if play / forward / rewind active..
var isMoving = false;
var audio = document.getElementById("audioElem");
var loopAudio = new Audio("");
var aux = {
    fallbackMessage: 'HTML5 audio not supported', // initial sound volume
    initialVolume: 0.7
};

$(document).ready(function () {
    var title, artist, mp3url, image;
    $.getJSON("https://listen.ssr990.com/assets/podparser.php?callback=?&Podurl=" + Podurl, {}, function (playlist) {
        console.log(playlist);
        for (var i = 0; Object.keys(playlist).length > i; i++) {
            $('.tracklist').prepend('<li class=""><div><a href="javascript:;" class="jp-playlist-item-remove" style="display: none;">×</a><a href="javascript:;" class="jp-playlist-item" tabindex="0" name="' + escape_html(playlist[i].title) + '" artist="' + escape_html(playlist[i].artist) + '" url="' + playlist[i].mp3 + '" image="' + playlist[i].poster + '">' + escape_html(playlist[i].title) + '</a></div></li>');
        }
        var num = Object.keys(playlist).length - 1;
        title = escape_html(playlist[num].title);
        artist = escape_html(playlist[num].artist);
        mp3url = playlist[num].mp3;
        image = playlist[num].poster;
        var wheelVal = getWheelValues(0);
        updateWheelValue(wheelVal);
        updateSong(title, artist, mp3url,image,false);
    });
});
$(document).on('click', ".jp-playlist-item", function () {
    title = $(this).attr('name');
    artist = $(this).attr('artist');
    mp3url = $(this).attr('url');
    image = $(this).attr('image');
    var wheelVal = getWheelValues(0);
    updateWheelValue(wheelVal);
    //ほんとは動き付けたかったけど気持ち悪くなるブラウザもあるのでコメントアウト
    //switchSides();
    updateSong(title, artist, mp3url, image,true);
});

function updateSong(title, artist, url, image,autoplay) {
    //まずはぐるぐるのみを表示
    $('div.vc-buttons').hide();
    $('div.vc-loader').show();
    $('.track-title').text(title);
    $('.track-image').attr("src",image);
    //$('.track-artist').text(artist);
    stop();
    audio.src = url;
    cntTime = 0;
    playable = false;
    if(autoplay){
        play();
    }else{
        play();
        setTimeout(function(){stop();},1000);
    }
}
//リスナーの設定
$('#vc-control-play').on('mousedown', function (event) {
    setButtonActive($(this));
    play();
});
$('#vc-control-stop').on('mousedown', function (event) {
    setButtonActive($(this));
    stop();
});
$('#vc-control-fforward').on('mousedown', function (event) {
    setButtonActive($(this));
    forward();
});
$('#vc-control-rewind').on('mousedown', function (event) {
    setButtonActive($(this));
    rewind();
});
$('#audioElem').on('timeupdate', function (event) {
    cntTime = audio.currentTime;
    var wheelVal = getWheelValues(cntTime);
    updateWheelValue(wheelVal);
});
$('#audioElem').on('loadedmetadata', function (event) {});
$('#audioElem').on('ended', function (event) {
    timeIterator += audio.duration;
    stop();
});

function setButtonActive($button) {
    // TODO. Solve! For now:
    $button.addClass('vc-control-pressed');
    setTimeout(function () {
        $button.removeClass('vc-control-pressed');
    }, 100);
}

function updateAction(action) {
    lastaction = action;
}

function changeVolume(ratio) {
    audio.volume = ratio;
}

function switchSides() {
    //A、B面の概念は削除するが、プレイリスト変更時のデザインとして残す。
    playSE('switch');
    lastaction = '';
    //currentSide = 2;
    $('div.vc-tape').css({
        '-webkit-transform': 'rotate3d(0, 1, 0, 180deg)'
        , '-moz-transform': 'rotate3d(0, 1, 0, 180deg)'
        , '-o-transform': 'rotate3d(0, 1, 0, 180deg)'
        , '-ms-transform': 'rotate3d(0, 1, 0, 180deg)'
        , 'transform': 'rotate3d(0, 1, 0, 180deg)'
    });
    //currentSide = 1;
    setTimeout(function () {
        $('div.vc-tape').css({
            '-webkit-transform': 'rotate3d(0, 1, 0, 0deg)'
            , '-moz-transform': 'rotate3d(0, 1, 0, 0deg)'
            , '-o-transform': 'rotate3d(0, 1, 0, 0deg)'
            , '-ms-transform': 'rotate3d(0, 1, 0, 0deg)'
            , 'transform': 'rotate3d(0, 1, 0, 0deg)'
        });
        //_self.$tapeSideB.hide();
        //_self.$tapeSideA.show();
        // update wheels
        cntTime = 0;
    }, 300);
}
//ボタンのへこみ再現処理
function updateButtons(button) {
    var pressedClass = 'vc-control-active';
    $('div.vc-control-play').removeClass(pressedClass);
    $('div.vc-control-stop').removeClass(pressedClass);
    $('div.vc-control-rewind').removeClass(pressedClass);
    $('div.vc-control-fforward').removeClass(pressedClass);
    switch (button) {
    case 'play':
        $('div.vc-control-play').addClass(pressedClass);
        break;
    case 'rewind':
        $('div.vc-control-rewind').addClass(pressedClass);
        break;
    case 'forward':
        $('div.vc-control-fforward').addClass(pressedClass);
        break;
    }
}

function play() {
    updateButtons('play');
    $.when(playSE('click')).done(function () {
        var data = updateStatus();
        if (data) {
            audio.preload = "auto";
            audio.play();
            playable = true;
            setTimeout(function () {
                audio.currentTime = cntTime;
                //audio.currentTime = audio.duration;
                isMoving = true;
                setWheelAnimation('2s', 'play');
                //audio.removeEventListener('canplay', playEvent);
                //実際のコントローラ表示
                $('div.vc-buttons').show();
                $('div.vc-loader').hide();
            }, 150);
        }
    });
}

function updateStatus(buttons) {
    var posTime = cntTime;
    // first stop
    stop(true);
    setSidesPosStatus('middle');
    // the current time to play is this.cntTime +/- [this.elapsed]
    if (lastaction === 'forward') {
        posTime += elapsed;
    }
    else if (lastaction === 'rewind') {
        posTime -= elapsed;
    }
    // check if we have more songs to play on the current side..
    if (posTime >= audio.duration) {
        stop(buttons);
        setSidesPosStatus('end');
        return false;
    }
    resetElapsed();
    // given this, we need to know which song is playing at this point in time,
    // and from which point in time within the song we will play
    // update cntTime
    if (playable) {
        cntTime = posTime;
        // update timeIterator
        timeIterator = cntTime - audio.duration;
    }
    return true;
}

function rewind() {
    var action = 'rewind';
    if (audio.currentTime == 0) {
        return false;
    }
    updateButtons(action);
    $.when(playSE('click')).done(function () {
        updateStatus(true);
        isMoving = true;
        updateAction(action);
        playSE('rewind', true);
        setWheelAnimation('0.5s', action);
        timer();
    });
}

function forward() {
    var action = 'forward';
    if (audio.currentTime === audio.duration) {
        return false;
    }
    updateButtons(action);
    $.when(playSE('click')).done(function () {
        updateStatus(true);
        isMoving = true;
        updateAction(action);
        playSE('fforward', true);
        setWheelAnimation('0.5s', action);
        timer();
    });
}

function stop(buttons) {
    if (!buttons) {
        updateButtons('stop');
        playSE('click');
    }
    isMoving = false;
    stopWheels();
    audio.pause();
    stopTimer();
}

function clear() {
    this.$audioEl.children('source').remove();
}

function setSidesPosStatus(position) {
    cntPosition = position;
}

function getWheelValues(x) {
    var T = audio.duration
        , val = {
            left: (true) ? (-70 / T) * x + 70 : (70 / T) * x
            , right: (true) ? (70 / T) * x : (-70 / T) * x + 70
        };
    return val;
}

function getPosTime() {
    var wleft = this.$wheelLeft.data('wheel')
        , wright = this.$wheelRight.data('wheel');
    if (wleft === undefined) {
        wleft = 70;
    }
    if (wright === undefined) {
        wright = 0;
    }
    var T = this._getSide().current.getDuration()
        , posTime = this.currentSide === 2 ? (T * wleft) / 70 : (T * wright) / 70;
    return posTime;
}

function updateWheelValue(wheelVal) {
    this.$('div.vc-tape-wheel-left').data('wheel', wheelVal.left).css({
        'box-shadow': '0 0 0 ' + wheelVal.left + 'px black'
    });
    this.$('div.vc-tape-wheel-right').data('wheel', wheelVal.right).css({
        'box-shadow': '0 0 0 ' + wheelVal.right + 'px black'
    });
}

function setWheelAnimation(speed, mode) {
    var anim = '';
    if (mode === 'play' || mode === 'forward') {
        anim = 'rotateLeft';
    }
    else if (mode === 'rewind') {
        anim = 'rotateRight';
    }
    var animStyle = {
        '-webkit-animation': anim + ' ' + speed + ' linear infinite forwards'
        , '-moz-animation': anim + ' ' + speed + ' linear infinite forwards'
        , '-o-animation': anim + ' ' + speed + ' linear infinite forwards'
        , '-ms-animation': anim + ' ' + speed + ' linear infinite forwards'
        , 'animation': anim + ' ' + speed + ' linear infinite forwards'
    };
    setTimeout(function () {
        $('div.vc-tape-wheel-right').css(animStyle);
        $('div.vc-tape-wheel-left').css(animStyle);
    }, 0);
}

function stopWheels() {
    var wheelStyle = {
        '-webkit-animation': 'none'
        , '-moz-animation': 'none'
        , '-o-animation': 'none'
        , '-ms-animation': 'none'
        , 'animation': 'none'
    }
    $('div.vc-tape-wheel-left').css(wheelStyle);
    $('div.vc-tape-wheel-right').css(wheelStyle);
}
// credits: http://www.sitepoint.com/creating-accurate-timers-in-javascript/
function timer() {
    var start = new Date().getTime()
        , time = 0;
    resetElapsed();
    isSeeking = true;
    setSidesPosStatus('middle');
    if (isSeeking) {
        clearTimeout(timertimeout);
        timertimeout = setTimeout(function () {
            timerinstance(start, time);
        }, 100);
    }
}

function timerinstance(start, time) {
    time += 100;
    elapsed = Math.floor(time / 20) / 1;
    if (Math.round(elapsed) == elapsed) {
        this.elapsed += 0.0;
    }
    // stop if it reaches the end of the cassette / side
    // or if it reaches the beginning
    var posTime = cntTime;
    if (lastaction === 'forward') {
        posTime += elapsed;
    }
    else if (lastaction === 'rewind') {
        posTime -= elapsed;
    }
    var wheelVal = getWheelValues(posTime);
    updateWheelValue(wheelVal);
    if (posTime >= audio.duration || posTime <= 0) {
        stop();
        (posTime <= 0) ? cntTime = 0: cntTime = posTime;
        resetElapsed();
        (posTime <= 0) ? setSidesPosStatus('start'): setSidesPosStatus('end');
        return false;
    }
    var diff = (new Date().getTime() - start) - time;
    if (isSeeking) {
        clearTimeout(timertimeout);
        timertimeout = setTimeout(function () {
            timerinstance(start, time);
        }, (100 - diff));
    }
}

function stopTimer() {
    clearTimeout(timertimeout);
    isSeeking = false;
}

function resetElapsed() {
    elapsed = 0.0;
}
//SE再生の設定
function playSE(seName, isLoop) {
    return $.Deferred(function (dfd) {
        if (isLoop) {
            loopAudio.loop = true;
            loopAudio.autoplay = false;
            loopAudio.src = "sounds/" + seName + ".mp3";
            loopAudio.play();
        }
        else {
            seAudio = new Audio("");
            seAudio.autoplay = false;
            seAudio.loop = false;
            seAudio.src = "sounds/" + seName + ".mp3";
            loopAudio.pause();
            seAudio.play();
        }
        setTimeout(function () {
            dfd.resolve();
        }, 500);
    });
}
//音量つまみの初期化
$('div.vc-volume-knob').knobKnob({
    snap: 10
    , value: 359 * aux.initialVolume
    , turn: function (ratio) {
        changeVolume(ratio);
    }
});
audio.volume = aux.initialVolume;