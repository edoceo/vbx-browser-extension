/**
	This code Copyright 2011-2012 Edoceo, Inc
*/

'use strict';

var Color = {
	Red: [255, 0, 0, 192],
	Green: [0, 192, 0, 192],
	Grey: [56, 56, 56, 56],
};

var Connection = null;

//function modeFail()
//{
//}

function getData(k)
{
	return localStorage.getItem(k);
}

function setData(k, v)
{
	return localStorage.setItem(k, v);
}

var tdToken = false;

// 
var _app = 'Chrome Twilio Phone';
var l = function(x) { if (window.console) console.log(x); };

var ctp = {

	w: 2100, // Wait Time after some Event
	ec:0, // Error Count

	call: function (d)
	{
		l('ctp.call(' + d + ')');
		Connection = Twilio.Device.connect({
			"To": d
		});
		// l('status:' + Connection.status());
		// var u = 'https://' + localStorage['_user_sid'] + ':' + localStorage._auth_tid + '@api.twilio.com/2010-04-01/Accounts/' + localStorage._user_sid'] + '/Calls.json';
		// var p = {
		//	 'ApplicationSid':localStorage['_prog_sid'],
		//	 'From':'+12062826500', // 'client:' + localStorage['_plug_did'], // From number the Callee Sees
		//	 'To':'+12063918470'
		// };
		// window.console && console.log('ctp.post(' + u + ')');
		// $.post(u,p);
		// alert(Connection.status());
		// Connection.accept();
		// Connection.disconnect();
		// l('status:' + Connection.status());
	},

	// Loading
	init: function ()
	{

		if ('good' != localStorage.getItem('mic-access')) {
			ctp.stat('perm', Color.Red, 'Configure A/V Permissions');
			return;
		}

		if (!localStorage.call_dial_last) localStorage.call_dial_last = '';
		if (!localStorage.call_text_last) localStorage.call_text_last = '';

		// ctp.stat('init', Color.Red);

		if (!localStorage._plug_did) {
			ctp.stat('name', Color.Red, 'Configure Client Name');
			localStorage._option_warn = 'Please provide a Twilio Authentication Information';
			chrome.tabs.create({'url': 'options.html'});
			return;
		}

		// Web Token Request
		var wtr = {};
		wtr.scope = 'scope:client:outgoing?appSid=' + localStorage._prog_sid + '&appParams=&clientName=' + localStorage._plug_did + ' scope:client:incoming?clientName=' + localStorage._plug_did;
		wtr.iss = localStorage._user_sid;
		wtr.exp = Math.round(new Date().getTime() / 1000) + 3600; // Now + 1 Hour

		var tok = new jwt.WebToken(JSON.stringify(wtr), JSON.stringify({typ: 'JWT', alg: 'HS256'}));
		tdToken = tok.serialize(localStorage._auth_tid);
		Twilio.Device.setup(tdToken, {
			debug: true
		});

	},
	kill: function ()
	{
		if (Connection) {
			Connection.disconnect();
			Connection = null;
		}
		Twilio.Device.disconnectAll();
	},

//	move: function () {
//		$.post('http://api.twilio.com/2010-04-01/Accounts/{account_sid}/Calls/{call_sid}',
//			{'Url': 'https://app-uri/twiml'},
//			function(ret, xhr, res) {
//				alert(ret);
//			}
//		);
//	},
	stat: function (n, c, t) // Note, Colour, Info Text
	{
		l('ctp.stat(' + n + ',' + c + ',' + t + ')'); //  + Twilio.Device.status());
		if (!t) t = _app;
		chrome.browserAction.setTitle({title: t });
		chrome.browserAction.setBadgeText({text: n});
		chrome.browserAction.setBadgeBackgroundColor({color: c});
		//chrome.browserAction.setIcon({
        //    path: "img/phone-idle.png",
        //});
	},

	take: function()
	{
		Connection.want++;
		Connection.accept(); // no return value
		l('ctp.take( ' + Connection.status() + ') @' + Connection.want);
		if (Connection.want >= 2) {
			ctp.stat('fail', Color.Red, 'Cannot Accept; likely due to Media Permissions');
			return false;
		}
		return true;
	},

	/**

	*/
	logs_list: function(cb) {
		var u = 'https://' + localStorage._user_sid + ':' + localStorage._auth_tid + '@api.twilio.com/2010-04-01/Accounts/' + localStorage._user_sid + '/Notifications.json?Page=0&PageSize=10';
		console.log('ctp.post(' + u + ')');
		$.get(u,cb);
	},

	/**
		@param
	*/
	text: function(n,t,cb) {
		var u = 'https://' + localStorage._user_sid + ':' + localStorage._auth_tid + '@api.twilio.com/2010-04-01/Accounts/' + localStorage._user_sid + '/SMS/Messages.json';
		var p = {
			'From':'+12062826500', // 'client:' + localStorage._plug_did'], // From number the Callee Sees
			'To':n,
			'Body':t
		};
		console.log('ctp.post(' + u + ')');
		$.post(u,p,cb);
	},
	/**
		@param cb callback function
	*/
	text_list: function(cb) {
		var u = 'https://' + localStorage._user_sid + ':' + localStorage._auth_tid + '@api.twilio.com/2010-04-01/Accounts/' + localStorage._user_sid + '/SMS/Messages.json';
		u += '?Page=0&PageSize=10';
		window.console && console.log('ctp.text_list(' + u + ')');
		$.get(u,cb);
	}
};

chrome.browserAction.onClicked.addListener(function(tab) {

	if ('good' != localStorage.getItem('mic-access')) {
		chrome.tabs.create({'url': 'options.html'});
	} else {
		chrome.browserAction.setPopup({ popup: "popup.html" });
	}

});


// Init my Thing
document.addEventListener("DOMContentLoaded", function () {

	ctp.init();

	// Ready Handler
	Twilio.Device.ready(function(d) {
		console.log('Twilio.Device.ready(' + d + ')');
		Connection = null;
		ctp.stat('idle', Color.Green, 'Ready');
	});

	// Incoming
	Twilio.Device.incoming(function (x) {
		// l('Twilio.Device.incoming()');
		Connection = x;
		Connection.want = 0;
		ctp.stat('ring', [255, 0, 0, 192], 'From: ' + Connection.parameters.From);
	});

	// Connected
	Twilio.Device.connect(function (c) {
		l('Twilio.Device.connect()');
		ctp.stat('talk', [255, 133, 0, 192], c.parameters.From);
		chrome.tabs.create({
			url: 'https://edoceo.com/imperium.git/search?q=' + c.parameters.From
		});
	});

	// Disconnected
	Twilio.Device.disconnect(function (x) {
		l('Twilio.Device.disconnect()');
		ctp.stat('done', Color.Grey);
		ctp.kill();
		window.setTimeout(function() {
			ctp.init();
		}, 1);
	});

	// Cancel - incoming connection is canceled by the caller before it is accepted
	Twilio.Device.cancel(function(x) {
		console.log('Twilio.Device.cancel()');
		Connection = false;
		ctp.kill();
		ctp.stat('drop', Color.Red);
		window.setTimeout(function() {
			ctp.init();
		}, 1);
	});

//	// Offline Event
//	Twilio.Device.offline(function() {
//		l('Twilio.Device.offline()');
//		ctp.kill();
//		ctp.stat('...',[56, 56, 56, 128]);
//	});
//	
//	
//	// Token has expired => Make a new one
	Twilio.Device.error(function (e) {
		c = false;
		// l('Twilio.Device.error(' + e.message + ')');
		ctp.kill();
		ctp.stat('fail',[255, 0, 0, 192],e.message);
		// window.setTimeout(function() { ctp.init(); }, ctp.w * ctp.ec );
		ctp.ec += 0.5;
	});
});

// Add Context Menu Items
// chrome.contextMenus.create({
//	 type:'normal',
//	 title:'Twilio It!',
//	 contexts:[ 'link', 'selection' ],
//	 onclick:function(ocd,tab) { alert('This functionality is not fully implemented yet'); }
// }, function() {
//	 if (chrome.extension.lastError) {
//		 ctp.stat('fail',[255, 0, 0, 192]);
//		 chrome.browserAction.setTitle({title: chrome.extension.lastError});
//	 }
// });
