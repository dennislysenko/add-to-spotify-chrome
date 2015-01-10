/**
 * All connectors are defined here, instead of manifest.
 *
 * Matching connector is injected to the page after document_end event.
 *
 * Do not include jQuery - it is included by default.
 *
 *
 * Supported fields:
 *
 *    label
 *          - label to be shown in options to enable/disable the connector
 *          - be careful with renaming, as connector disable state depends on the label
 *
 *    matches
 *          - array of positive matches in format described in Chrome Ext. Dev. guide
 *          - connectors are processed in order and the first match is used; you can use
 *            this behaviour to emulate exclude matches
 *
 *    js
 *          - array of paths of files to be executed
 *          - all executions happen on or after 'document_end'
 *
 *    allFrames (optional)
 *          - boolean value representing InjectDetails.allFrames
 *          - FALSE by default
 *
 */

var connectors = [
    /*{
     label: "myspace",
     description : "MySpace",
     matches: ["*://myspace.com/*"],
     js: ["connectors/myspace.js"]
     },*/
    {
        label: "pandora",
        description: "Pandora Internet Radio",
        matches: ["*://www.pandora.com/*"],
        js: ["connectors/pandora.js"]
    },
    /*{
     label: "deezer",
     matches: ["*://www.deezer.com/*"],
     description : "Deezer",
     js: ["connectors/deezer.js"]
     },*/
    {
        label: "google",
        matches: ["*://play.google.com/music/*"],
        description: "Google Play Music",
        js: ["connectors/googlemusic.js"]
    },
    /*{
     label: "myspace",
     matches: ["*://myspace.com/*"],
     description : "MySpace",
     js: ["connectors/myspace.js"]
     },*/
/**
 * There's a bug with Soundcloud that causes the injected script
 * to be injected more than once resulting in duplicate plays, and actually
 * everytime the page is open.
 */
    {
        label: "soundcloud",
        description: "Soundcloud",
        matches: ["*://soundcloud.com/*"],
        js: ["connectors/soundcloud.js"]
    },
    /*{
     label: "vk",
     description : "VK",
     matches: ["*://vk.com/*"],
     js: ["connectors/vk.js"]
     },*/
    /*{
     label: "iheart",
     description : "iHeart Radio",
     matches: ["*://*.iheart.com/*"],
     js: ["connectors/iheart.js"]
     },*/
    /*{
     label: "Gaana.com",
     matches: ["*://gaana.com/*"],
     js: ["connectors/gaana.js"]
     },*/
    {
        label: "spotify",
        description: "Spotify Web Player",
        matches: ["https://play.spotify.com/*"],
        js: ["connectors/spotify.js"]
    },
    {
        label: "grooveshark",
        description: "Gooveshark",
        matches: ["*://grooveshark.com/*"],
        js: ["connectors/grooveshark.js"]
    },
    {
        label: "tracks",
        description: "8-Tracks",
        matches: ["*://8tracks.com/*"],
        js: ["connectors/8tracks.js"]
    },
    {
        label: "songza",
        description: "Songza",
        matches: ["*://songza.com/*"],
        js: ["connectors/songza.js"]
    },
    {
        label: "rdio",
        description: "Rdio",
        matches: ["*://www.rdio.com/*"],
        js: ["connectors/rdio.js"]
    },
    /*{
     label: "gaana",
     description : "Gaana",
     matches: ["*://www.gaana.com/*"],
     js: ["connectors/gaana.js"]
     },*/
    {
        label: "youtube",
        description: "YouTube",
        matches: ["*://www.youtube.com/*"],
        js: ["connectors/youtube.js"]
    },
    {
        label: "di",
        description: "Digitally Imported",
        matches: ["*://www.di.fm/*"],
        js: ["connectors/di.js"]
    }
];


/**
 * Creates regex from single match pattern
 *
 * @author lacivert
 * @param {String} input
 * @returns RegExp
 */
function createPattern(input) {
    if (typeof input !== 'string') return null;
    var match_pattern = '^'
        , regEscape = function (s) {
            return s.replace(/[[^$.|?*+(){}\\]/g, '\\$&');
        }
        , result = /^(\*|https?|file|ftp|chrome-extension):\/\//.exec(input);

    // Parse scheme
    if (!result) return null;
    input = input.substr(result[0].length);
    match_pattern += result[1] === '*' ? 'https?://' : result[1] + '://';

    // Parse host if scheme is not `file`
    if (result[1] !== 'file') {
        if (!(result = /^(?:\*|(\*\.)?([^\/*]+))/.exec(input))) return null;
        input = input.substr(result[0].length);
        if (result[0] === '*') {    // host is '*'
            match_pattern += '[^/]+';
        } else {
            if (result[1]) {         // Subdomain wildcard exists
                match_pattern += '(?:[^/]+\.)?';
            }
            // Append host (escape special regex characters)
            match_pattern += regEscape(result[2]);// + '/';
        }
    }
    // Add remainder (path)
    match_pattern += input.split('*').map(regEscape).join('.*');
    match_pattern += '$';

    return new RegExp(match_pattern);
}


function isConnectorEnabled(player) {
    var disabledArray = JSON.parse(localStorage["disabledConnectors"]);
    var i = disabledArray.indexOf(player)
    return (i == -1);
}

var injectScriptIfComplete = function (tab) {
    var tabId = tab.id;

    // wait for the Loaded event
    if (tab.status !== 'complete')
        return;

    // run first available connector
    var anyMatch = !connectors.every(function (connector) {
        var matchOk = false;

        connector.matches.forEach(function (match) {
            matchOk = matchOk || createPattern(match).test(tab.url);
        });

        if (matchOk === true) {
            console.log('connector ' + connector.label + ' matched for ' + tab.url);
            //setActionIcon(ACTION_SITE_RECOGNIZED, tabId);

            if (!isConnectorEnabled(connector.label)) {
                //setActionIcon(ACTION_SITE_DISABLED, tabId);
                return false; // break forEach
            }

            // Ping the content page to see if the script is already in place.
            // In the future, connectors will have unified interface, so they will all support
            // the 'ping' request. Right now only YouTube supports this, because it
            // is the only site that uses ajax navigation via History API (which is quite hard to catch).
            // Other connectors will work as usual.
            //
            // Sadly there is no way to silently check if the script has been already injected
            // so we will see an error in the background console on load of every supported page
            chrome.tabs.sendMessage(tabId, {type: 'ping'}, function (response) {
                // if the message was sent to a non existing script or the script
                // does not implement the 'ping' message, we get response==undefined;
                if (!response) {
                    console.log('-- loaded for the first time, injecting the scripts');

                    // inject all scripts and jQuery, use slice to avoid mutating
                    console.log('a');
                    var scripts = connector.js.slice(0);
                    console.log('b');
                    scripts.unshift(JQUERY_PATH);
                    console.log('c');

                    scripts.forEach(function (jsFile) {
                        console.log('d');
                        console.log(jsFile);
                        var injectDetails = {
                            file: jsFile,
                            allFrames: connector.allFrames ? connector.allFrames : false
                        };
                        chrome.tabs.executeScript(tabId, injectDetails);
                        console.log('dd');
                    });
                }
                else {
                    console.log('-- subsequent ajax navigation, the scripts are already injected');
                }
            });

        }
        return !matchOk;
    });

    // hide page action if there is no match
    if (!anyMatch) {
        if (chrome.pageAction)
            chrome.pageAction.hide(tabId);
    }
};

/**
 * Initially inject scripts into all open tabs
 */
chrome.tabs.getAllInWindow(null, function(tabs) {
    for (var i = 0; i < tabs.length; i++) {
        var tab = tabs[i];
        injectScriptIfComplete(tab);
    }
});

/**
 * Injects connectors to tabs upon page loading
 */
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    injectScriptIfComplete(tab);
});
