/* eslint no-console: 0 */
/* global chrome */

var cm_server_url = 'https://www.linkmelater.win';
const CM_IS_DEV_MODE = !('update_url' in chrome.runtime.getManifest());
const CM_CLOSE_TAB_SETTING_ID = 'LML_CloseTab';
if (CM_IS_DEV_MODE) {
	console.log('Context Menu: Extension running in development mode');
	cm_server_url = 'https://localhost:5000';
} else {
	cm_server_url = 'https://www.linkmelater.win';
}
// cm_server_url = 'https://localhost:5000';
// var chrome = chrome;

chrome.contextMenus.removeAll();
chrome.contextMenus.create({
	title: 'Go to Dashboard',
	contexts: ['browser_action'],
	onclick: function () {
		var target_url = cm_server_url + '/dashboard';
		chrome.tabs.create({
			url: target_url
		}, function (tab) {
			console.log('New tab launched with ' + target_url);
		});
	}
});

var setCloseTabSetting = function (bool, callback) {

	chrome.storage.sync.set({
		'LML_Close_Tab_Setting': bool
	}, function () {
		console.log('Close tab setting saved locally');
		if (callback) callback();
	});
};

var getCloseTabSetting = function (callback) {
	// chrome.storage.sync.get('LML_Close_Tab_Setting', (setting) => {
		
	// });
	chrome.storage.sync.get('LML_Close_Tab_Setting', ({ LML_Close_Tab_Setting = false }) => {
		// console.log('Close tab setting fetched locally: ' + LML_Close_Tab_Setting);
		callback(LML_Close_Tab_Setting);
	});
};
chrome.contextMenus.create({
	title: 'Close Tab On Click',
	type: 'checkbox',
	id: 'LML_CloseTab',
	checked: false,
	contexts: ['browser_action'],
	onclick: function (object) {
		setCloseTabSetting(object.checked);
	}
});

function setCloseTabCheckbox(setting) {
	chrome.contextMenus.update(CM_CLOSE_TAB_SETTING_ID, {
		checked: setting
	});
}


// Check the default setting and update options menu
getCloseTabSetting(setCloseTabCheckbox);