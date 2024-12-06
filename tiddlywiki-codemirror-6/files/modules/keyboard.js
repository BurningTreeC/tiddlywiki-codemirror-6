/*\
title: $:/core/modules/keyboard.js
type: application/javascript
module-type: global

Keyboard handling utilities

\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

var conversionKeys = {
	"ArrowLeft": "Left",
	"ArrowRight": "Right",
	"ArrowUp": "Up",
	"ArrowDown": "Down",
	",": "Comma",
	";": "Semicolon",
	".": "Period",
	":": "Colon",
	"PageUp": "Page_up",
	"PageDown": "Page_down"
};

function KeyboardManager(options) {
	var self = this;
	options = options || "";
	// Save the platform-specific name of the "meta" key
	this.metaKeyName = $tw.platform.isMac ? "cmd-" : "win-";
	this.conversionKeys = conversionKeys;
	this.shortcutKeysList = [], // Stores the shortcut-key descriptors
	this.shortcutActionList = [], // Stores the corresponding action strings
	this.shortcutParsedList = []; // Stores the parsed key descriptors
	this.shortcutPriorityList = []; // Stores the parsed shortcut priority
	this.lookupNames = ["shortcuts"];
	this.lookupNames.push($tw.platform.isMac ? "shortcuts-mac" : "shortcuts-not-mac")
	this.lookupNames.push($tw.platform.isWindows ? "shortcuts-windows" : "shortcuts-not-windows");
	this.lookupNames.push($tw.platform.isLinux ? "shortcuts-linux" : "shortcuts-not-linux");
	this.updateShortcutLists(this.getShortcutTiddlerList());
	$tw.wiki.addEventListener("change",function(changes) {
		self.handleShortcutChanges(changes);
	});
}

/*
Return an array of keycodes for the modifier keys ctrl, shift, alt, meta
*/
KeyboardManager.prototype.getModifierKeys = function() {
	return [
		"Shift", // Shift
		"Control", // Ctrl
		"Alt", // Alt
		"CapsLock", // CAPS LOCK
		"Meta", // Meta (left)
		"AltGraph" // Meta (right)
	]
};

/*
Parses a key descriptor into the structure:
{
	keyCode: numeric keycode
	shiftKey: boolean
	altKey: boolean
	ctrlKey: boolean
	metaKey: boolean
}
Key descriptors have the following format:
	ctrl+enter
	ctrl+shift+alt+A
*/
KeyboardManager.prototype.parseKeyDescriptor = function(keyDescriptor,options) {
	var components = keyDescriptor.split(/\+|\-/),
		info = {
			key: 0,
			shiftKey: false,
			altKey: false,
			ctrlKey: false,
			metaKey: false
		};
	for(var t=0; t<components.length; t++) {
		var s = components[t].toLowerCase(),
			c = s.charCodeAt(0);
		// Look for modifier keys
		if(s === "ctrl") {
			info.ctrlKey = true;
		} else if(s === "shift") {
			info.shiftKey = true;
		} else if(s === "alt") {
			info.altKey = true;
		} else if(s === "meta" || s === "cmd" || s === "win") {
			info.metaKey = true;
		}
	}
	info.key = this.getKeyComponent(info,components);
	if(options.keyDescriptor) {
		info.keyDescriptor = options.keyDescriptor;
	}
	if(info.key) {
		return info;
	} else {
		return null;
	}
};

KeyboardManager.prototype.lowerCaseKey = function(key) {
	if(key) {
		return key.charAt(0).toLowerCase() + key.slice(1);
	} else {
		return null;
	}
};

KeyboardManager.prototype.upperCaseKey = function(key) {
	if(key) {
		return key.charAt(0).toUpperCase() + key.slice(1);
	} else {
		return null;
	}
};

KeyboardManager.prototype.getKeyComponent = function(info,components) {
	var key;
	for(var i=0; i<components.length; i++) {
		if(!info[components[i]]) {
			key = components[i];
		}
	}
	return this.lowerCaseKey(key);
};

/*
Parse a list of key descriptors into an array of keyInfo objects. The key descriptors can be passed as an array of strings or a space separated string
*/
KeyboardManager.prototype.parseKeyDescriptors = function(keyDescriptors,options) {
	var self = this;
	options = options || {};
	options.stack = options.stack || [];
	var wiki = options.wiki || $tw.wiki;
	if(typeof keyDescriptors === "string" && keyDescriptors === "") {
		return [];
	}
	if(!$tw.utils.isArray(keyDescriptors)) {
		keyDescriptors = keyDescriptors.split(" ");
	}
	var result = [];
	$tw.utils.each(keyDescriptors,function(keyDescriptor) {
		// Look for a named shortcut
		if(keyDescriptor.substr(0,2) === "((" && keyDescriptor.substr(-2,2) === "))") {
			if(options.stack.indexOf(keyDescriptor) === -1) {
				options.stack.push(keyDescriptor);
				var name = keyDescriptor.substring(2,keyDescriptor.length - 2),
					lookupName = function(configName) {
						var keyDescriptors = wiki.getTiddlerText("$:/config/" + configName + "/" + name);
						if(keyDescriptors) {
							options.keyDescriptor = keyDescriptor;
							result.push.apply(result,self.parseKeyDescriptors(keyDescriptors,options));
						}
					};
				$tw.utils.each(self.lookupNames,function(platformDescriptor) {
					lookupName(platformDescriptor);
				});
			}
		} else {
			result.push(self.parseKeyDescriptor(keyDescriptor,options));
		}
	});
	return result;
};

KeyboardManager.prototype.getPrintableShortcuts = function(keyInfoArray) {
	var self = this,
		result = [];
	$tw.utils.each(keyInfoArray,function(keyInfo) {
		if(keyInfo) {
			var key = self.conversionKeys[keyInfo.key] || keyInfo.key;
			result.push((keyInfo.ctrlKey ? "ctrl-" : "") + 
					(keyInfo.shiftKey ? "shift-" : "") + 
					(keyInfo.altKey ? "alt-" : "") + 
					(keyInfo.metaKey ? self.metaKeyName : "") + 
					(self.upperCaseKey(key)));
		}
	});
	return result;
};

KeyboardManager.prototype.checkKeyDescriptor = function(event,keyInfo) {
	var key = this.conversionKeys[event.key] || event.key;
	return keyInfo &&
			this.lowerCaseKey(key) === keyInfo.key && 
			event.shiftKey === keyInfo.shiftKey && 
			event.altKey === keyInfo.altKey && 
			event.ctrlKey === keyInfo.ctrlKey && 
			event.metaKey === keyInfo.metaKey;
};

KeyboardManager.prototype.checkKeyDescriptors = function(event,keyInfoArray) {
	return (this.getMatchingKeyDescriptor(event,keyInfoArray) !== null);
};

KeyboardManager.prototype.getMatchingKeyDescriptor = function(event,keyInfoArray) {
	for(var t=0; t<keyInfoArray.length; t++) {
		if(this.checkKeyDescriptor(event,keyInfoArray[t])) {
			return keyInfoArray[t];
		}
	}
	return null;
};

KeyboardManager.prototype.getEventModifierKeyDescriptor = function(event) {
	return event.ctrlKey && !event.shiftKey	&& !event.altKey && !event.metaKey ? "ctrl" : 
		event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey ? "shift" : 
		event.ctrlKey && event.shiftKey && !event.altKey && !event.metaKey ? "ctrl-shift" : 
		event.altKey && !event.shiftKey && !event.ctrlKey && !event.metaKey ? "alt" : 
		event.altKey && event.shiftKey && !event.ctrlKey && !event.metaKey ? "alt-shift" : 
		event.altKey && event.ctrlKey && !event.shiftKey && !event.metaKey ? "ctrl-alt" : 
		event.altKey && event.shiftKey && event.ctrlKey && !event.metaKey ? "ctrl-alt-shift" : 
		event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey ? "meta" : 
		event.metaKey && event.ctrlKey && !event.shiftKey && !event.altKey ? "meta-ctrl" :
		event.metaKey && event.ctrlKey && event.shiftKey && !event.altKey ? "meta-ctrl-shift" :
		event.metaKey && event.ctrlKey && event.shiftKey && event.altKey ? "meta-ctrl-alt-shift" : "normal";
};

KeyboardManager.prototype.getShortcutTiddlerList = function() {
	return $tw.wiki.getTiddlersWithTag("$:/tags/KeyboardShortcut");
};

KeyboardManager.prototype.updateShortcutLists = function(tiddlerList) {
	this.shortcutTiddlers = tiddlerList;
	for(var i=0; i<tiddlerList.length; i++) {
		var title = tiddlerList[i],
			tiddlerFields = $tw.wiki.getTiddler(title).fields;
		this.shortcutKeysList[i] = tiddlerFields.key !== undefined ? tiddlerFields.key : undefined;
		this.shortcutActionList[i] = tiddlerFields.text;
		this.shortcutParsedList[i] = this.shortcutKeysList[i] !== undefined ? this.parseKeyDescriptors(this.shortcutKeysList[i]) : undefined;
		this.shortcutPriorityList[i] = tiddlerFields.priority === "yes" ? true : false;
	}
};

/*
event: the keyboard event object
options:
	onlyPriority: true if only priority global shortcuts should be invoked
*/
KeyboardManager.prototype.handleKeydownEvent = function(event, options) {
	options = options || {};
	var key, action;
	for(var i=0; i<this.shortcutTiddlers.length; i++) {
		if(options.onlyPriority && this.shortcutPriorityList[i] !== true) {
			continue;
		}
		if(this.shortcutParsedList[i] !== undefined && this.checkKeyDescriptors(event,this.shortcutParsedList[i])) {
			key = this.shortcutParsedList[i];
			action = this.shortcutActionList[i];
		}
	}
	if(key !== undefined) {
		event.preventDefault();
		event.stopPropagation();
		$tw.rootWidget.invokeActionString(action,$tw.rootWidget,event);
		return true;
	}
	return false;
};

KeyboardManager.prototype.detectNewShortcuts = function(changedTiddlers) {
	var shortcutConfigTiddlers = [],
		handled = false;
	$tw.utils.each(this.lookupNames,function(platformDescriptor) {
		var descriptorString = "$:/config/" + platformDescriptor + "/";
		Object.keys(changedTiddlers).forEach(function(configTiddler) {
			var configString = configTiddler.substr(0, configTiddler.lastIndexOf("/") + 1);
			if(configString === descriptorString) {
				shortcutConfigTiddlers.push(configTiddler);
				handled = true;
			}
		});
	});
	if(handled) {
		return $tw.utils.hopArray(changedTiddlers,shortcutConfigTiddlers);
	} else {
		return false;
	}
};

KeyboardManager.prototype.handleShortcutChanges = function(changedTiddlers) {
	var newList = this.getShortcutTiddlerList();
	var hasChanged = $tw.utils.hopArray(changedTiddlers,this.shortcutTiddlers) ? true :
		($tw.utils.hopArray(changedTiddlers,newList) ? true :
		(this.detectNewShortcuts(changedTiddlers))
	);
	// Re-cache shortcuts if something changed
	if(hasChanged) {
		this.updateShortcutLists(newList);
	}
};

exports.KeyboardManager = KeyboardManager;

})();
