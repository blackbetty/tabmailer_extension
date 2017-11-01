// Check to see if I am running this locally for dev mode
const SETTINGS_ENDPOINT = "/settings";
const LINKS_POST_ENDPOINT = "/linksforuser"
const REDIR_URL = 'https://hjckfmabbnhjkfejdmiecefhkbekkefe.chromiumapp.org';
const IS_DEV_MODE = !('update_url' in chrome.runtime.getManifest());
const WEB_AUTH_FLOW_URL_1 = "https://accounts.google.com/o/oauth2/auth?client_id=881057203535-i7f0fqflce385r6u0p41nvseto0k8gbk.apps.googleusercontent.com&redirect_uri=";
const WEB_AUTH_FLOW_URL_2 = "&response_type=token&scope=https://www.googleapis.com/auth/userinfo.profile";
var server_url = 'something went wrong if this logs';
// Using chrome.identity
var manifest = chrome.runtime.getManifest();



function isDevMode() {
    chrome.management.getSelf(function(extensionInfo) {
        if (extensionInfo.ExtensionInstallType == "development") {
            return true;
        }
        return false
    });
}

if (IS_DEV_MODE) {
    console.log('Extension running in development mode');
    server_url = 'https://localhost:5000';
} else {
    server_url = 'https://tabmailer-174400.appspot.com';
}


// All useless for now, need to standardize auth path
// function authenticatedGET(url) {
//     return new Promise((resolve, reject) => {
//         var retry = true;

//         function getTokenAndXhr() {

//             // for some reason the actual redirectMethod returns an additional /, which
//             // Google Console does not like, despite me registering that as a redirect URL...
//             var redirURL = REDIR_URL;
//             chrome.identity.launchWebAuthFlow({
//                     url: WEB_AUTH_FLOW_URL_1 + redirURL + WEB_AUTH_FLOW_URL_2,
//                     interactive: true
//                 },
//                 function(redirect_url) {
//                     if (chrome.runtime.lastError) {
//                         reject(chrome.runtime.lastError);
//                         console.log(chrome.runtime.lastError);
//                         return;
//                     }

//                     // As if this whole process wasn't a big enough pain in the ass,
//                     // this is C/P'd from SO because parsing this shit is not something I felt like doing
//                     // seriously FU google
//                     var access_token = new URL(redirect_url).hash.split('&').filter(function(el) { if (el.match('access_token') !== null) return true; })[0].split('=')[1];

//                     var fullUrl = url + "?google_auth_token=" + access_token;

//                     var xhr = new XMLHttpRequest();
//                     xhr.open("GET", fullUrl, true);
//                     xhr.setRequestHeader('Authorization',
//                         'Bearer ' + access_token);
//                     xhr.setRequestHeader("Content-Type", "application/json");

//                     xhr.onload = function() {
//                         if (this.status === 401 && retry) {
//                             // This status may indicate that the cached
//                             // access token was invalid. Retry once with
//                             // a fresh token.
//                             retry = false;
//                             chrome.identity.removeCachedAuthToken({ 'token': access_token },
//                                 getTokenAndXhr);
//                             return;
//                         } else if (this.readyState == XMLHttpRequest.DONE && this.status == 200) {
//                             resolve(this.response);
//                         } else if (this.readyState == XMLHttpRequest.DONE && this.status != 200) {
//                             reject(this.status);
//                         }
//                     }
//                     xhr.send();
//                 });
//         }
//         getTokenAndXhr();

//     });
// }



// var getSettings = new Promise((resolve, reject) => {


//     var getSettings = authenticatedGET(SETTINGS_URL);

//     getSettings.then(function(settingsValue) {
//         resolve(settingsValue);
//     }, function(rejectionReason) {
//         console.log("Settings Fetch Failed");
//         reject(false);
//     });
// })


// const setSettings = function(settings) {
//     chrome.storage.sync.set({ 'settings': settings }, function() {
//         console.log("Settings saved locally");
//     });
// }


chrome.runtime.onInstalled.addListener(function(object) {
    if (chrome.runtime.OnInstalledReason.INSTALL === object.reason) {
        chrome.tabs.create({ url: server_url }, function(tab) {
            console.log("New tab launched with " + server_url);
        });
    }

    // fix later
    // getSettings
    //     .then(function(settings) {
    //         setSettings(settings)
    //     })
    //     .catch(function(error) {
    //         console.log("Settings error hit top level");
    //     });
});


function getCurrentTabUrl(callback) {
    var queryInfo = {
        active: true,
        currentWindow: true
    };
    chrome.tabs.query(queryInfo, function(tabs) {
        var tab = tabs[0];

        var url = tab.url;
        var title = tab.title;
        var tabID = tab.id;
        if (tabID == null || tabID == chrome.tabs.TAB_ID_NONE) {
            tabID = null;
        }

        console.assert(typeof url == 'string', 'tab.url should be a string');

        var post_data = {
            tab_url: url,
            tab_title: title
        };

        authenticatedXhr("POST", server_url + LINKS_POST_ENDPOINT, post_data, callback)
    });

}


function showNotification(title, message) {
    chrome.notifications.create(Math.rand, {
        type: 'basic',
        iconUrl: 'icon.png',
        title: title,
        message: message,
    }, function(notificationId) {});

}

function closeCurrentTab() {
    chrome.tabs.query({
        active: true,
        currentWindow: true
    }, function(tabs) {
        chrome.tabs.remove(tabs[0].id, function() {});
    });

}


function displayCompletionMessage(completion, responseObject) {
    if (completion === true) {
        responseObject = JSON.parse(responseObject);
        showNotification('Complete!', 'Successfully added ' + responseObject.saved_url + ' to your TabMailer queue!');
        if (responseObject.newSettings) {
            chrome.storage.sync.set({ 'settings': responseObject.newSettings }, function() {
                // Notify that we saved.
                console.log("WHAT IS GOING ON");
                chrome.storage.sync.get('settings', function(items) {
                    console.log(items.settings);
                    console.log(items.settings["close_tab"]);
                    if (items.settings["close_tab"] == "true") {
                        console.log('closetab is true')
                        closeCurrentTab();
                    }
                });
            });
        } else {
            chrome.storage.sync.get('settings', function(items) {
                if (items.settings.close_tab == "true") {
                    closeCurrentTab();
                }
            })
        }
    } else {
        showNotification('Error!', 'Failed to add the URL: ' + responseObject + ' to your TabMailer queue :(');
    }
};

// callback = function (error, httpStatus, responseText);
function authenticatedXhr(method, url, req_body, callback) {
    var retry = true;

    function getTokenAndXhr() {

        // for some reason the actual redirectMethod returns an additional /, which
        // Google Console does not like, despite me registering that as a redirect URL...
        var redirURL = REDIR_URL;
        chrome.identity.launchWebAuthFlow({
                url: "https://accounts.google.com/o/oauth2/auth?client_id=881057203535-i7f0fqflce385r6u0p41nvseto0k8gbk.apps.googleusercontent.com&redirect_uri=" + redirURL + "&response_type=token&scope=https://www.googleapis.com/auth/userinfo.profile",
                interactive: true
            },
            function(redirected_to) {
                if (chrome.runtime.lastError) {
                    callback(chrome.runtime.lastError);
                    console.log(chrome.runtime.lastError);
                    if(IS_DEV_MODE) console.log('Remember to add the key field to the manifest, hermano');
                    return;
                }

                // As if this whole process wasn't a big enough pain in the ass,
                // this is C/P'd from SO because parsing this shit is not something I felt like doing
                // seriously FU google
                var access_token = new URL(redirected_to).hash.split('&').filter(function(el) { if (el.match('access_token') !== null) return true; })[0].split('=')[1];
                req_body['google_access_token'] = access_token;

                var xhr = new XMLHttpRequest();
                xhr.open(method, url, true);
                xhr.setRequestHeader('Authorization',
                    'Bearer ' + access_token);
                xhr.setRequestHeader("Content-Type", "application/json");

                xhr.onload = function() {
                    if (this.status === 401 && retry) {
                        // This status may indicate that the cached
                        // access token was invalid. Retry once with
                        // a fresh token.
                        retry = false;
                        chrome.identity.launchWebAuthFlow({ 'url': 'https://accounts.google.com/logout' },
                            function(tokenUrl) {
                                console.log('wtf is going on');
                                getTokenAndXhr();
                            }
                        );
                        return;
                    } else if (this.readyState == XMLHttpRequest.DONE && this.status == 200) {
                        callback(true, this.response);
                    } else if (this.readyState == XMLHttpRequest.DONE && this.status != 200) {
                        callback(false);
                    }
                }
                xhr.send(JSON.stringify(req_body));
            });
    }
    getTokenAndXhr();
}


chrome.browserAction.onClicked.addListener(function(tab) {

    getCurrentTabUrl(displayCompletionMessage);

});