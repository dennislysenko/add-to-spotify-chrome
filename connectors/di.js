/**
 * Created by dennis on 1/9/15.
 */

var DI_WATCH_ELEMENT = "#now-playing > div.info-container > div.title-container"; // anything less deep changes every 1sec
var DI_TITLE_ELEMENT = "#now-playing > div.info-container > div.title-container > div.title";
var DI_TIMEOUT_LENGTH = 700;
var DI_TIMEOUT = null;

var DI_LAST_TRACK = null;

// Attach listener for song changes, filter out duplicate event firings
$(function () {
    console.log("Digitally Imported scrobbling module starting up");

    /**
     * Sends a now playing message to the scrobbler.
     * @pre DI_LAST_TRACK is an array of two string values
     */
    function DI_updateNowPlaying() {
        var track = DI_LAST_TRACK;

        chrome.runtime.sendMessage({
            type: 'nowPlaying',
            artist: track[0],
            track: track[1],
            source: "Digitally Imported",
            tag: "DI"
        });
    }

    // Attach listener to "recently played" song list
    $(DI_WATCH_ELEMENT).live('DOMSubtreeModified', function (e) {
        console.log("Update triggered");

        var full_title = $(DI_TITLE_ELEMENT).text();
        var artist, title;
        if (full_title) {
            var split = full_title.split(" - ");
            if (split.length == 2) {
                artist = split[0];
                title = split[1];
            }
        }

        var track = [artist, title];
        if (artist && title && track != DI_LAST_TRACK) {
            DI_LAST_TRACK = track;

            // Stop any non-scrobbled songs (i.e. song skipped)
            if (DI_TIMEOUT) {
                clearTimeout(DI_TIMEOUT);
            }

            // Schedule the next scrobble
            DI_TIMEOUT = setTimeout(DI_updateNowPlaying, DI_TIMEOUT_LENGTH);
        }
    });

    $(window).unload(function () {
        console.log("Resetting scrobbler.");
        chrome.runtime.sendMessage({type: 'reset'});
        return true;
    });
});

/**
 * Listen for requests from scrobbler.js
 */
chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        switch (request.type) {

            // background calls this to see if the script is already injected
            case 'ping':
                sendResponse(true);
                break;
        }
    }
);