/**
 * Wiring in the "flip" switch for now playing notifications.
 */
$(document).ready(function () {
    var element = '#myonoffswitch';
    console.log(localStorage["useNotificationsNowPlaying"]);
    /**
     * Set the initial state of the button
     */
    if (localStorage["useNotificationsNowPlaying"] == 1) {
        $(element).prop('checked', true);
    }
    else {
        $(element).prop('checked', false);
    }
    /**
     * Invoked when the switch is flipped.
     */
    $(element).change(function () {
        console.log("Change event in checkbox.");
        if (localStorage["useNotificationsNowPlaying"] == 1) {
            localStorage["useNotificationsNowPlaying"] = -1;
        }
        else {
            localStorage["useNotificationsNowPlaying"] = 1;

        }
        console.log(localStorage["useNotificationsNowPlaying"]);
    })
});