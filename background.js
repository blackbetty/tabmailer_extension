// Check to see if I am running this locally for dev mode
function isDevMode() {
    return !('update_url' in chrome.runtime.getManifest());
}

var server_url = 'something went wrong if this logs';
if (isDevMode()) {
    server_url = 'https://localhost:5000/linksforuser';
    console.log('requests will be sent to ' + server_url);
} else {
    server_url = 'https://tabmailer-174400.appspot.com/linksforuser';
}


function getCurrentTabUrl(callback) {
    var queryInfo = {
        active: true,
        currentWindow: true
    };

    chrome.tabs.query(queryInfo, function(tabs) {
        var tab = tabs[0];

        var url = tab.url;

        console.assert(typeof url == 'string', 'tab.url should be a string');
        var request = new XMLHttpRequest();
        request.onreadystatechange = function() { //Call a function when the state changes.

            console.log("hit outside conditional");
            if (request.readyState == XMLHttpRequest.DONE && request.status == 200) {
                callback(true, tab.url);
            } else if (request.readyState == XMLHttpRequest.DONE && request.status != 200) {
                callback(false);
            }
        }
        request.open("POST", server_url, true);


        request.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        request.send(JSON.stringify({ tab_url: url }));
        console.log("REQUEST SENT");
    });

}


function showNotification(title, message) {
    chrome.notifications.create('reminder', {
        type: 'basic',
        iconUrl: 'icon.png',
        title: title,
        message: message,
    }, function(notificationId) {});

}

function displayCompletionMessage(completion, tabURL) {
    if (completion === true) {
        showNotification('Complete!', 'Successfully added ' + tabURL + ' to your TabMailer queue!');
    } else {
        showNotification('Error!', 'Failed to add the URL: '+ tabURL +' to your TabMailer queue :(');
    }
};


chrome.browserAction.onClicked.addListener(function(tab) {
    // chrome.tabs.executeScript(null, {file: "sendURL.js"});
    getCurrentTabUrl(displayCompletionMessage);
});