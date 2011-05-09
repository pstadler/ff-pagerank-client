/**
 * PageRank Client for Firefox
 *
 * Source freely available on GitHub: https://github.com/pstadler/ff-pagerank-client
 * 
 * @author Patrick Stadler <patrick@koeniglich.ch>
 */
var PageRankClient = {
	includePattern: /^https?:/,
	excludePatterns: [
		/^https?:\/\/.*google\..*\/(search|images|groups|news).*/,
		/^https?:\/\/localhost.*/,
		/^https?:\/\/(127\.|10\.|172\.16|192\.168).*/
	],
	_service: { uri: null },
	_request: null,
	_lastRequestUri: null,
	_preferences: null,
	_resultCache: {},
	_defaultTooltipText: null,
	_clickListener: function(event) { if(event.button === 0) { PageRankClient.toggle(); } },
	_focusListener: function() { PageRankClient.log(window._content.document.location); PageRankClient.getPR(); },

	init: function() {
		this._preferences = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.pagerank-client.");
		this._service.uri = this.getPreference('service.uri');		
		// Add item to addon-bar
		var pane = document.getElementById('pagerank-client');
		var addonBar = document.getElementById('addon-bar');
		if(addonBar) {
			if(!pane) {
				pane = addonBar.insertItem('pagerank-client');
				addonBar.collapsed = false;
			}
		}
		this._defaultTooltipText = pane.tooltipText;
		pane.addEventListener('click', this._clickListener, true);
		if(this.getPreference('enabled')) {
			this.getPR();
			window.addEventListener('focus', this._focusListener, true);
		} else {
			this.updatePane('disabled');
		}
	},
	
	halt: function() {
		var pane = document.getElementById('pagerank-client');
		this.updatePane('disabled');
		this._lastRequestUri = null;
		pane.removeEventListener('click', this._clickListener, true);
		window.removeEventListener('focus', this._focusListener, true);
	},
	
	getPR: function() {
		var location = window._content.document.location;
		if(this._resultCache[location] !== undefined) {
			this.updatePane(this._resultCache[location]);
		} else {
			if(!this.includePattern.test(location)) {
				this.updatePane('na');
				return false;
			}		
			for(var i in this.excludePatterns) {
				if(this.excludePatterns[i].test(location)) {
					this.updatePane('na');
					return false;
				}
			}
			if(this._lastRequestUri !== location) {
				this._lastRequestUri = location;
				this.updatePane('na');
				this.request(location);
			}
		}
	},
	
	request: function(uri) {
		this._request = new XMLHttpRequest();
		this._request.open("GET", this._service.uri + '/' + uri, true);
		this._request.setRequestHeader('User-Agent', navigator.userAgent + ' pagerank-client');
		this._request.onreadystatechange = this.handleResponse.bind(this);
		this._request.send(null);
	},
	
	handleResponse: function() {
		if(this.getPreference('enabled')) {
			if(this._request.readyState === 4 && this._request.status === 200) {
				var response = this._request.responseText;
				if(response.length > 0) {
					var rank = response.match(/^Rank_1:\d+:(\d+)/)[1];
					if(parseInt(rank, 10) >= 0) {
						this._resultCache[this._lastRequestUri] = rank;
					} else {
						this._resultCache[this._lastRequestUri] = 'na';
					}
					this.updatePane(this._resultCache[this._lastRequestUri]);
				}
			}
		}
	},
	
	toggle: function() {
		if(this.getPreference('enabled')) {
			this.setPreference('enabled', false);
			this.updatePane('disabled');
			this._lastRequestUri = null;
			window.removeEventListener('focus', this._focusListener, true);
		} else {
			this.setPreference('enabled', true);
			this.getPR();			
			window.addEventListener('focus', this._focusListener, true);
		}
	},
	
	updatePane: function(rank) {
		var pane = document.getElementById('pagerank-client');
		var menu = document.getElementById('pagerank-client-menu-toggle');
		var tooltipText = this._defaultTooltipText + ': ';
		var menuLabel = 'Disable';
		switch(rank) {
			case 'disabled':
				tooltipText += 'disabled (click to enable)';
				menuLabel = 'Enable';
				break;
				
			case 'na':
				tooltipText += 'N/A';
				break;
				
			default:
				tooltipText += rank + '/10';
				break;
		}
		pane.setAttribute('rank', rank);
		menu.setAttribute('label', menuLabel);
		pane.tooltipText = tooltipText;
	},
	
	clearCache: function() {
		this._resultCache = {};
	},
	
	getPreference: function(key) {
		switch(key) {
			case 'enabled':
				return this._preferences.getBoolPref(key);
			
			case 'service.uri':
				return this._preferences.getCharPref(key);
			
			default:
				/* Unknown key, do nothing */
				return;
		}
	},
	
	setPreference: function(key, value) {
		switch(key) {
			case 'enabled':
				this._preferences.setBoolPref(key, value);
				break;
			
			case 'service.uri':
			this._preferences.setCharPref(key, value);
				break;

			default:
				/* Unknown key, do nothing */
				break;
		}
	},
	
	about: function() {
		window.open('http://pagerank.koeniglich.ch/?ref-ff', 'pagerank-client-about');
	},
	
	log: function(msg) {
		Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService).logStringMessage('[PageRankClient] ' + msg);
	}
};

window.addEventListener('load', function() {
	// Set up private browsing listener
	var pbl = new PrivateBrowsingListener();
	if(!pbl.inPrivateBrowsing) {
		PageRankClient.init();
	}
	pbl.watcher = {
		onEnterPrivateBrowsing: function() { PageRankClient.halt(); },
		onExitPrivateBrowsing: function() { PageRankClient.init(); }
	};
}, true);

