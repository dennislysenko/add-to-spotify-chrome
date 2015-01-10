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
function showLoading(message) {
    $('#loading_message').slideDown().text(message);
}
function hideLoading() {
    $('#loading_message').slideUp();
}
function showPlaylists(playlists, trackUri) {
    $('#playlists').html('');

    function createPlaylistClickHandler(playlistId, trackUri) {
        return function(e) {
            $.get(ADD_SONG_ENDPOINT
                + "?access_token=" + localStorage["accessToken"]
                + "&playlist_id=" + playlistId
                + "&track_uri=" + trackUri,
                function (data) {
                    if (data.success == true) {
                        alert('Success');
                    } else {
                        alert('Failure');
                    }
                });
        };
    }

    for (var index in playlists) {
        var playlist = playlists[index];

        var link = document.createElement('a');
        link.href = '#';
        link.onclick = createPlaylistClickHandler(playlist.id, trackUri);
        link.innerText = playlist.name;

        $('#playlists').appendChild(link)
            .appendChild(document.createElement('br'));
    }
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
                $.get(PLAYLISTS_ENDPOINT + "?access_token=" + localStorage["accessToken"], function (data) {
                    if (data.success !== false && data.items) {
                        var prompt_message = 'Playlists:\n';
                        for (var index in data.items) {
                            var playlist = data.items[index];
                            prompt_message += (parseInt(index) + 1) + '. ' + playlist.name + '\n';
                        }
                        prompt_message += '\nType any number (1-' + data.items.length + '):';

                        var choice = 0;
                        while (choice < 1 || choice > data.items.length) {
                            choice = parseInt(prompt(prompt_message, "1"))
                        }

                        var playlistId = data.items[choice - 1].id;


                    } else {
                        alert('Opening a login window. Please try again after going through the following process');
                        window.open(LOGIN_ENDPOINT + "?access_token=" + localStorage["accessToken"]);
                    }
                });
            } else {
                alert('Couldn\'t find song');
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