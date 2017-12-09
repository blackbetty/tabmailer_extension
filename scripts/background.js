/* eslint no-console: 0 */
/* global chrome */
const LINKS_POST_ENDPOINT = '/linksforuser';
const REDIR_URL = 'https://hjckfmabbnhjkfejdmiecefhkbekkefe.chromiumapp.org';
// Check to see if I am running this locally for dev mode
const IS_DEV_MODE = !('update_url' in chrome.runtime.getManifest());
const WEB_AUTH_FLOW_URL_1 = 'https://accounts.google.com/o/oauth2/auth?client_id=881057203535-i7f0fqflce385r6u0p41nvseto0k8gbk.apps.googleusercontent.com&redirect_uri=';
const WEB_AUTH_FLOW_URL_2 = '&response_type=token&scope=https://www.googleapis.com/auth/userinfo.profile';
const SETTINGS_ENDPOINT = '/settings';
var bg_server_url = 'something went wrong if this logs';
// Using chrome.identity
var manifest = chrome.runtime.getManifest();



// function isDevMode() {
// 	chrome.management.getSelf(function (extensionInfo) {
// 		if (extensionInfo.ExtensionInstallType == 'development') {
// 			return true;
// 		}
// 		return false;
// 	});
// }

if (IS_DEV_MODE) {
	console.log('Background: Extension running in development mode');
	bg_server_url = 'https://localhost:5000';
} else {
	bg_server_url = 'https://linkmelater.win';
}

// bg_server_url = 'https://localhost:5000';
// console.log(bg_server_url);

// All useless
// for now, need to standardize auth path

function authenticatedGET(url) {
	return new Promise((resolve, reject) => {
		var retry = true;

		function getTokenAndXhr() {

			// for some reason the actual redirectMethod returns an additional /, which
			// Google Console does not like, despite me registering that as a redirect URL...
			var redirURL = REDIR_URL;
			chrome.identity.launchWebAuthFlow({
				url: WEB_AUTH_FLOW_URL_1 + redirURL + WEB_AUTH_FLOW_URL_2,
				interactive: true
			},
			function (redirect_url) {
				if (chrome.runtime.lastError) {
					reject(chrome.runtime.lastError);
					console.log(chrome.runtime.lastError);
					return;
				}

				// As if this whole process wasn't a big enough pain in the ass,
				// this is C/P'd from SO because parsing this shit is not something I felt like doing
				// seriously FU google
				var access_token = new URL(redirect_url).hash.split('&').filter(function (el) {
					if (el.match('access_token') !== null) return true;
				})[0].split('=')[1];

				var fullUrl = url + '?google_access_token=' + access_token;

				var xhr = new XMLHttpRequest();
				xhr.open('GET', fullUrl, true);
				xhr.setRequestHeader('Authorization',
					'Bearer ' + access_token);
				xhr.setRequestHeader('Content-Type', 'application/json');

				xhr.onload = function () {
					if (this.status === 401 && retry) {
						// This status may indicate that the cached
						// access token was invalid. Retry once with
						// a fresh token.
						retry = false;
						chrome.identity.removeCachedAuthToken({
							'token': access_token
						},
						getTokenAndXhr);
						return;
					} else if (this.readyState == XMLHttpRequest.DONE && this.status == 200) {
						resolve(this.response);
					} else if (this.readyState == XMLHttpRequest.DONE && this.status != 200) {
						reject(this.status);
					}
				};
				xhr.send();
			}
			);
		}
		getTokenAndXhr();

	});
}

/*
	ContextMenu handles this now
*/

// var getSettings = async function () {

// 	var settings;
// 	try {
// 		settings = await authenticatedGET(bg_server_url + SETTINGS_ENDPOINT);
// 		return settings;
// 	} catch (error) {
// 		console.log('Settings Fetch Failed: ' + error);
// 		throw new Error(error);
// 	}
// };


const initiateCloseTabSetting = function () {

	chrome.storage.sync.set({
		'LML_Close_Tab_Setting': false
	}, function () {
		console.log('Local Close Tab Setting Created');
	});
};


chrome.runtime.onInstalled.addListener(async function (object) {
	if (object.reason === chrome.runtime.OnInstalledReason.INSTALL) {
		initiateCloseTabSetting();
		chrome.tabs.create({
			url: bg_server_url
		}, function (tab) {
			console.log('New tab launched with ' + bg_server_url);
		});
	}
	/* 	server-side settings are now no-longer relevant to the extension, close setting is now local
		commenting out on 12/9/17
		can delete once user-tested
	*/ 
	// var settings;
	// try {
	// 	settings = await getSettings();
	// } catch (error) {
	// 	console.log('Settings error hit top level: ' + error);
	// }
	// console.log('1: ' + settings);
	// if (settings != undefined) setLocalSettings(settings);

});


function getCurrentTabUrl(callback) {
	return new Promise((resolve, reject) => {
		var queryInfo = {
			active: true,
			currentWindow: true
		};
		chrome.tabs.query(queryInfo, function (tabs) {
			var tab = tabs[0];

			var url = tab.url;
			var title = tab.title;
			var tabID = tab.id;
			if (tabID == null || tabID == chrome.tabs.TAB_ID_NONE) {
				tabID = null;
			}

			console.assert(typeof url == 'string', 'tab.url should be a string');

			var tab_data = {
				tab_url: url,
				tab_title: title,
				tab_id: tabID
			};

			resolve(tab_data);
		});
	});


}


function showNotification(title, message) {
	chrome.notifications.create(Math.rand, {
		type: 'basic',
		iconUrl: 'icon.png',
		title: title,
		message: message,
	}, function (notificationId) {});

}

function closeCurrentTab(tabID) {
	var tabQueryObject = {
		active: true,
		currentWindow: true
	};
	chrome.tabs.query(tabQueryObject, (tabs) => {
		var tabIDToRemove = tabs[0].id;
		if (tabID != null) {
			tabIDToRemove = tabID;
		}
		chrome.tabs.remove(tabIDToRemove, function () {});
	});

}


function displayCompletionMessage(responseObject, tabID) {
	responseObject = JSON.parse(responseObject);
	showNotification('Complete!', 'Successfully added ' + responseObject.saved_url + ' to your LinkMeLater queue!');

	chrome.storage.sync.get('LML_Close_Tab_Setting', ({
		LML_Close_Tab_Setting = false
	}) => {

		if (LML_Close_Tab_Setting == true) {
			closeCurrentTab(tabID);
		}
	});
}

// callback = function (error, httpStatus, responseText);
function authenticatedXhr(method, url, req_body) {
	return new Promise((resolve, reject) => {
		var retry = true;

		function getTokenAndXhr() {

			// for some reason the actual redirectMethod returns an additional /, which
			// Google Console does not like, despite me registering that as a redirect URL...
			var redirURL = REDIR_URL;
			chrome.identity.launchWebAuthFlow({
				url: 'https://accounts.google.com/o/oauth2/auth?client_id=881057203535-i7f0fqflce385r6u0p41nvseto0k8gbk.apps.googleusercontent.com&redirect_uri=' + redirURL + '&response_type=token&scope=https://www.googleapis.com/auth/userinfo.profile',
				interactive: true
			},
			function (redirected_to) {
				if (chrome.runtime.lastError) {
					console.log(chrome.runtime.lastError);
					if (IS_DEV_MODE) console.log('Remember to add the key field to the manifest, hermano');
					reject(chrome.runtime.lastError);
				}

				// As if this whole process wasn't a big enough pain in the ass,
				// this is C/P'd from SO because parsing this shit is not something I felt like doing
				// seriously FU google
				var access_token = new URL(redirected_to).hash.split('&').filter(function (el) {
					if (el.match('access_token') !== null) return true;
				})[0].split('=')[1];
				req_body['google_access_token'] = access_token;
				var xhr = new XMLHttpRequest();
				xhr.open(method, url, true);
				xhr.setRequestHeader('Authorization',
					'Bearer ' + access_token);
				xhr.setRequestHeader('Content-Type', 'application/json');

				xhr.onload = function () {
					if (this.status === 401 && retry) {
						// This status may indicate that the cached
						// access token was invalid. Retry once with
						// a fresh token.
						retry = false;
						chrome.identity.launchWebAuthFlow({
							'url': 'https://accounts.google.com/logout'
						},
						function (tokenUrl) {
							console.log('wtf is going on');
							getTokenAndXhr();
						}
						);
						return;
					} else if (this.readyState == XMLHttpRequest.DONE && this.status == 200) {
						resolve(this.response);
					} else if (this.readyState == XMLHttpRequest.DONE && this.status != 200) {
						reject(JSON.parse(this.response));
					}
				};
				xhr.send(JSON.stringify(req_body));
			});
		}
		getTokenAndXhr();
	});
}


chrome.browserAction.onClicked.addListener(function (tab) {
	var tabID;
	var tabTitle = 'fail';
	getCurrentTabUrl().then(async(postData) => {
		var reqBody = {
			tab_url: await postData.tab_url,
			tab_title: await postData.tab_title
		};
		tabID = await postData.tab_id;
		tabTitle = await postData.tab_id;
		authenticatedXhr('POST', bg_server_url + LINKS_POST_ENDPOINT, reqBody)
			.then(response => displayCompletionMessage(response, tabID))
			.catch((error) => {
				var displayErrorMessage = 'Error: ' + error.message;
				showNotification('Error!', displayErrorMessage);
				console.log(error.name);
			});
	}).catch((error) => {
		showNotification('Error!', 'Failed to add the URL: ' + tabTitle + ' to your TabMailer queue :(');
		console.log('An error occurred somewhere in the LINK POST: ' + error);
	});

});