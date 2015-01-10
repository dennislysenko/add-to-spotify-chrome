/**
 * Add to Spotify Chrome Extension
 */
console.log("Add to Spotify Chrome Extension Enabled");

/**
 * Determine login status
 */
if (localStorage["session"] === "" || !localStorage["session"])
    swap("whenLoggedOut", "whenLoggedIn");
else
    swap("whenLoggedIn", "whenLoggedOut");

/**
 * Connect/Remove event handlers.
 */
document.addEventListener('DOMContentLoaded', function () {
    document.getElementById("connect").addEventListener('click', function () {
        connectToService();
    }, false)
});
document.addEventListener('DOMContentLoaded', function () {
    document.getElementById("remove").addEventListener('click', function () {
        // todo implement
    }, false)
});

/**
 * Stuff to do with the add button being clicked
 */
var hideLoadingTimeout = null;
function showLoading(message) {
    if (hideLoadingTimeout) clearTimeout(hideLoadingTimeout);
    $('#loading_message').show().text(message);
}
function hideLoading() {
    if (hideLoadingTimeout) clearTimeout(hideLoadingTimeout);
    $('#loading_message').hide();
}
function showMessage(message) {
    showLoading(message);
    hideLoadingTimeout = setTimeout(function() {
        hideLoading();
    }, 3000);
}
function showPlaylists(playlists, trackUri) {
    $('#playlists').html('');

    function createPlaylistClickHandler(playlistId, trackUri) {
        return function(e) {
            hidePlaylists();
            showLoading("Adding...");

            $.get(ADD_SONG_ENDPOINT
                + "?access_token=" + localStorage["session"]
                + "&playlist_id=" + playlistId
                + "&track_uri=" + trackUri,
                function (data) {
                    if (data.success == true) {
                        showMessage("Success!");
                    } else {
                        showMessage("Failed to add song.");
                    }
                });
        };
    }

    for (var index in playlists) {
        var playlist = playlists[index];

        var link = document.createElement('a');
        link.className = 'playlist';
        link.href = '#';
        link.onclick = createPlaylistClickHandler(playlist.id, trackUri);
        link.innerText = playlist.name;

        $('#playlists').append(link)
            .append(document.createElement('br'));
    }

    hideLoading();
    $('#playlists').show();
}
function hidePlaylists() {
    $('#playlists').hide();
}

$('#add-to-spotify').click(function () {
    showLoading("Finding song...");
    $.get(SEARCH_ENDPOINT
        + "?artist=" + localStorage["artist"]
        + "&title=" + localStorage["song"],
        function (data) {
            if (data.success) {
                showLoading("Getting playlists...");

                var trackUri = data.track.uri;
                $.get(PLAYLISTS_ENDPOINT + "?access_token=" + localStorage["session"], function (data) {
                    if (data.success !== false && data.items) {
                        showPlaylists(data.items, trackUri);
                    } else {
                        showLoading('Please try again after you see a window open with your Spotify account on it');
                        setTimeout(function() {
                            window.open(LOGIN_ENDPOINT + "?access_token=" + localStorage["session"]);
                        }, 2000);
                    }
                });
            } else {
                showMessage("Couldn't find that song on Spotify :(");
            }
        });
});

/**
 * Handle connecting to the service.
 * @returns
 */
function connectToService() {
    $.get(GENERATE_TOKEN_ENDPOINT, function (data) {
        if (data.success) {
            localStorage["session"] = data.access_token;

            if (localStorage["session"] != "") {
                swap("whenLoggedIn", "whenLoggedOut");
                document.getElementById("con-error").style.display = "none";

                window.open(LOGIN_ENDPOINT + "?access_token=" + data.access_token);
            }
            else {
                document.getElementById("con-error").style.display = "block";
            }
        }
    });
}

/**
 * Swapping between DIV's depending on login status.
 */
function swap(one, two) {
    document.getElementById(one).style.display = 'block';
    document.getElementById(two).style.display = 'none';

    if (one == "whenLoggedOut") {
        //document.getElementById("logout").style.display = 'none';

        document.getElementById("headerLoggedOut").style.display = 'block';
        document.getElementById("headerLoggedIn").style.display = 'none';
    } else {
        //document.getElementById("logout").style.display = 'block';

        document.getElementById("headerLoggedOut").style.display = 'none';
        document.getElementById("headerLoggedIn").style.display = 'block';
    }
}

function updatePopup() {
    console.log(localStorage["song"]);
    $('#song-track').text(localStorage["song"]);
    $('#song-artist').text(localStorage["artist"]);
}

$(document).ready(updatePopup);

chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        if (request.type == 'nowPlaying') {
            updatePopup();
        }
    }
);