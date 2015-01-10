/**
 * Chrome-Last.fm-Scrobbler Deezer.com Connector by @damienalexandre
 *
 * v1.0, 5 march 2012
 *
 * The difficulty here is that the song duration can appear a long time after the
 * song starts playing.
 * We use the title change to know when a song is played.
 *
 * @todo Handle the song "pause"? (do we have to cancel the scrobble?)
 * @todo Improve the way we deal with the first played song. I have made it lazy for perf purpose.
 */

var currentDeezerTimeout = null;

$(document).ready(function () {

    $("title").bind('DOMSubtreeModified', function () {
        cancel(); // In case we switch song before the scrobble (as the duration is async, we may warn the extension too late)

        if (currentDeezerTimeout) // Handle song fast zapping
        {
            window.clearTimeout(currentDeezerTimeout);
        }

        currentDeezerTimeout = window.setTimeout(sendTrack, 1000); // As the duration may be not available.
    });

    sendTrack(); // We maybe have a song playing right away. There is no retry if this call fails.

    $(window).unload(function () {
        cancel();
        return true;
    });
});

/**
 * Handle the chrome.extension
 * and can retry itself too.
 */
function sendTrack() {
    if (currentDeezerTimeout) {
        window.clearTimeout(currentDeezerTimeout);
    }

    var deezerSong = getCurrentTrack();
    if (deezerSong) {
        chrome.runtime.sendMessage({
            type: 'validate',
            artist: deezerSong.artist,
            track: deezerSong.track
        }, function (response) {
            if (response != false) {
                chrome.runtime.sendMessage({
                    type: 'nowPlaying',
                    artist: deezerSong.artist,
                    track: deezerSong.track,
                    source: "Deezer",
                    tag: "deezer"
                });
            }
            else {
                chrome.runtime.sendMessage({type: 'nowPlaying', duration: deezerSong.duration});
                displayMsg('Not recognized');
            }
        });
    }
    else if (currentDeezerTimeout) {
        currentDeezerTimeout = window.setTimeout(sendTrack, 1000);
    }
}

/**
 * Try to get the song infos (track, artist, duration)
 * @return object|boolean
 */
function getCurrentTrack() {
    if ($("#player_control_play").css("display") == "none") { // Play button hidden, the song is playing
        return {
            track: $("#player_track_title").text(),
            artist: $("#player_track_artist").text()
        }
    }
    return false;
}

/**
 * Binded on the unload
 */
function cancel() {
    chrome.runtime.sendMessage({type: 'reset'});
}