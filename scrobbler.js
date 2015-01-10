// browser tab with actually scrobbled track
var nowPlayingTab = null;

// song structure, filled in nowPlaying phase, (artist, track, album, duration, startTime)
var song = {};

var scrobbleTimeout = null;
/**
 * Used to track delayed event processing.
 */
var timeouts = [];


/**
 * This is never disabled.
 */
var disabled = false;

/**
 * Default settings & update notification
 */
{
    // use notifications by default
    if (localStorage.useNotifications == null)
        localStorage.useNotifications = 1;

    // now playing notifications
    if (localStorage.useNotificationsNowPlaying == null)
        localStorage.useNotificationsNowPlaying = 1;

    // scrobbled notifications
    if (localStorage.useNotificationsScrobbled == null)
        localStorage.useNotificationsScrobbled = 1;

    // no disabled connectors by default
    if (localStorage.disabledConnectors == null)
        localStorage.disabledConnectors = JSON.stringify([]);

    // hide notifications by default
    if (localStorage.autoHideNotifications == null)
        localStorage.autoHideNotifications = 1;

    // show update popup - based on different version
    if (localStorage.appVersion != chrome.app.getDetails().version) {
        localStorage.appVersion = chrome.app.getDetails().version;

        // introduce new options if not already set
        if (typeof localStorage.useAutocorrect == 'undefined')
            localStorage.useAutocorrect = 0;
    }

    /**
     * Automatically pop-up to register on first install.
     */
    if (!localStorage["firstPopup"]) {
        localStorage["firstPopup"] = true;
    }
}

function reset() {
    console.log('reset called');
    if (scrobbleTimeout != null) {
        clearTimeout(scrobbleTimeout);
        scrobbleTimeout = null;
    }
    nowPlayingTab = null;
}

/**
 * Sets up page action icon, including title and popup
 *
 * @param {integer} action one of the ACTION_ constants
 * @param {integer} tabId
 */
function setActionIcon(action, tabId) {

    var tab = tabId ? tabId : nowPlayingTab;
    chrome.pageAction.hide(tab);

    switch (action) {
        case ACTION_UNKNOWN:
            chrome.pageAction.setIcon({tabId: tab, path: ICON_UNKNOWN});
            chrome.pageAction.setTitle({tabId: tab, title: 'Song not recognized. Click the icon to correct its title'});
            chrome.pageAction.setPopup({tabId: tab, popup: 'popup.html'});
            break;
        case ACTION_NOWPLAYING:
            chrome.pageAction.setIcon({tabId: tab, path: ICON_NOTE});
            chrome.pageAction.setTitle({
                tabId: tab,
                title: 'Now playing: ' + song.artist + ' - ' + song.track + '\nClick to disable scrobbling'
            });
            chrome.pageAction.setPopup({tabId: tab, popup: ''});
            break;
        case ACTION_SCROBBLED:
            chrome.pageAction.setIcon({tabId: tab, path: ICON_TICK});
            chrome.pageAction.setTitle({tabId: tab, title: 'Song has been scrobbled\nClick to disable scrobbling'});
            chrome.pageAction.setPopup({tabId: tab, popup: ''});
            break;
        case ACTION_DISABLED:
            chrome.pageAction.setIcon({tabId: tab, path: ICON_NOTE_DISABLED});
            chrome.pageAction.setTitle({tabId: tab, title: 'Scrobbling is disabled\nClick to enable'});
            chrome.pageAction.setPopup({tabId: tab, popup: ''});
            break;
        case ACTION_REENABLED:
            chrome.pageAction.setIcon({tabId: tab, path: ICON_TICK_DISABLED});
            chrome.pageAction.setTitle({tabId: tab, title: 'Scrobbling will continue for the next song'});
            chrome.pageAction.setPopup({tabId: tab, popup: ''});
            break;
        case ACTION_CONN_DISABLED:
            chrome.pageAction.setIcon({tabId: tab, path: ICON_CONN_DISABLED});
            chrome.pageAction.setTitle({
                tabId: tab,
                title: 'Scrobbling for this site is disabled, most likely because the site has changed its layout. Please contact the connector author.'
            });
            chrome.pageAction.setPopup({tabId: tab, popup: ''});
            break;
        case ACTION_SITE_RECOGNIZED:
            chrome.pageAction.setIcon({tabId: tab, path: ICON_LOGO});
            chrome.pageAction.setTitle({tabId: tab, title: 'This site is supported for scrobbling'});
            chrome.pageAction.setPopup({tabId: tab, popup: ''});
            break;
        case ACTION_SITE_DISABLED:
            chrome.pageAction.setIcon({tabId: tab, path: ICON_LOGO});
            chrome.pageAction.setTitle({tabId: tab, title: 'This site is supported, but you disabled it'});
            chrome.pageAction.setPopup({tabId: tab, popup: ''});
            break;
    }
    chrome.pageAction.show(tab);
}


/**
 * Shows (or not) the notification, based on user settings
 * Use 'force' to override settings and always show the notification (e.g. for errors)
 */
function scrobblerNotification(text, force) {
    if (localStorage.useNotifications != 1 && !force)
        return;

    if (typeof(webkitNotifications) === "undefined")
        return;

    var title = 's';
    var body = '';
    var boom = text.split(NOTIFICATION_SEPARATOR);

    if (boom.length == 1)
        body = boom[0];
    else {
        title = boom[0];
        body = boom[1];
    }

    var notification = webkitNotifications.createNotification(
        'icon128.png',
        title,
        body
    );
    notification.show();

    if (localStorage.autoHideNotifications == 1)
        setTimeout(function () {
            notification.cancel()
        }, NOTIFICATION_TIMEOUT);
}

/**
 * Shows an error notification (use this rather than alerts)
 */
function errorNotification(text) {
    // Opera compatibility
    if (typeof(webkitNotifications) === "undefined")
        return;

    var title = 'Scrobble Error';

    var notification = webkitNotifications.createNotification(
        'icon128.png',
        title,
        text
    );
    notification.show();

    if (localStorage.autoHideNotifications == 1)
        setTimeout(function () {
            notification.cancel()
        }, NOTIFICATION_TIMEOUT);
}

/**
 * Called when NowPlaying has changed due to some event.
 */
function nowPlaying(request) {
    /**
     * Song is already playing!
     */
    if (song && song.artist === request.artist &&
        song.track === request.track) {
        return true;
    }
    song = {
        artist: request.artist,
        track: request.track,
        currentTime: request.currentTime,
        duration: request.duration,
        source: request.source,
        startTime: ( parseInt(new Date().getTime() / 1000.0) - request.currentTime) // in seconds
    }
    if (typeof(request.album) != 'undefined') {
        song.album = request.album;
    }
    /**
     * Added to populate the tweet
     */
    localStorage["song"] = song.track;
    localStorage["artist"] = song.artist;
    return false;
}

function isConnectorEnabled(player) {
    var disabledArray = JSON.parse(localStorage["disabledConnectors"]);
    var i = disabledArray.indexOf(player)
    return (i == -1);
}

function updateFrontendDisplay() {
    // song var now has: artist, track, source

}

/**
 * Handling messages from the detector scripts
 */
chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        switch (request.type) {

            // Called when a new song has started playing. If the artist/track is filled,
            // they have to be already validated! Otherwise they can be corrected from the popup.
            // Also sets up a timout to trigger the scrobbling procedure (when all data are valid)
            case "nowPlaying":
                console.log("nowPlaying " + JSON.stringify(request));

                // do the reset to be sure there is no other timer running
                reset();

                // remember the caller
                nowPlayingTab = sender.tab ? sender.tab.id : -1;

                // backward compatibility for connectors which dont use currentTime
                if (typeof(request.currentTime) == 'undefined' || !request.currentTime)
                    request.currentTime = 0;

                // data missing, save only startTime and show the unknown icon
                if (typeof(request.artist) == 'undefined' || !request.artist
                    || typeof(request.track) == 'undefined' || !request.track) {
                    // fill only the startTime, so the popup knows how to set up the timer
                    song = {
                        startTime: parseInt(new Date().getTime() / 1000.0) // in seconds
                    };

                    // if we know something...
                    if (typeof(request.artist) != 'undefined' && request.artist) {
                        song.artist = request.artist;
                    }
                    if (typeof(request.track) != 'undefined' && request.track) {
                        song.track = request.track;
                    }
                    if (typeof(request.currentTime) != 'undefined' && request.currentTime) {
                        song.currentTime = request.currentTime;
                    }
                    if (typeof(request.duration) != 'undefined' && request.duration) {
                        song.duration = request.duration;
                    }
                    if (typeof(request.album) != 'undefined' && request.album) {
                        song.album = request.album;
                    }
                }
                else {
                    var alreadyNowPlaying = nowPlaying(request);
                    console.log(localStorage["disabledConnectors"]);
                    if (isConnectorEnabled(request.tag) && !alreadyNowPlaying) {
                        updateFrontendDisplay();
                    }
                    else if (alreadyNowPlaying) {
                        console.log("Now Playing has not changed. Not scheduling push.");
                    }
                    else {
                        console.log("Tune will not be pushed since connector is disabled.");
                    }
                }
                sendResponse({});
                break;
            // called when the window closes / unloads before the song can be scrobbled
            case "reset":
                reset();
                sendResponse({});
                break;

            case "trackStats":
                _gaq.push(['_trackEvent', request.text]);
                sendResponse({});
                break;
            // returns the options in key => value pseudomap
            case "getOptions":
                var opts = {};
                for (var x in localStorage)
                    opts[x] = localStorage[x];
                sendResponse({value: opts});
                break;

            // do we need this anymore? (content script can use ajax)
            case "xhr":
                var http_request = new XMLHttpRequest();
                http_request.open("GET", request.url, true);
                http_request.onreadystatechange = function () {
                    if (http_request.readyState == 4 && http_request.status == 200)
                        sendResponse({text: http_request.responseText});
                };
                http_request.send(null);
                break;
            // for login
            case "newSession":
                sessionID = "";
                break;
            // connector tells us it is disabled
            case "reportDisabled":
                /**
                 * @TODO - Does this apply to us?
                 */
                break;
        /**
         * Connector will not submit this to NowPlaying unless we validate.
         * We want at least an artist and track
         */
            case "validate":
                if (!request.artist || !request.track) {
                    sendResponse(false);
                    break;
                }
                sendResponse(request);
                break;
            default:
                console.log('Unknown request: %s', $.dump(request));
        }
        return true;
    }
);
