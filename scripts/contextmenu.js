var server_url = 'https://tabmailer-174400.appspot.com';
const CM_IS_DEV_MODE = !('update_url' in chrome.runtime.getManifest());

if (CM_IS_DEV_MODE) {
    console.log('Extension running in development mode');
    server_url = 'https://localhost:5000';
} else {
    server_url = 'https://tabmailer-174400.appspot.com';
}


chrome.contextMenus.removeAll();
chrome.contextMenus.create({
	title: "Go to Dashboard",
	contexts: ["browser_action"],
	onclick: function() {
		var target_url = server_url+'/dashboard';
		chrome.tabs.create({ url: target_url }, function(tab) {
			console.log("New tab launched with " + target_url);
		});
	}
});