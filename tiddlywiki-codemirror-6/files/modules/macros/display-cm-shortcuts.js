/*\
title: $:/plugins/BTC/tiddlywiki-codemirror-6/modules/macros/display-cm-shortcuts.js
type: application/javascript
module-type: macro

Macro to display a list of keyboard shortcuts in human readable form. Notably, it resolves named shortcuts like `((bold))` to the underlying keystrokes.

\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

/*
Information about this macro
*/

exports.name = "display-cm-shortcuts";

exports.params = [
	{name: "shortcuts"},
	{name: "prefix"},
	{name: "separator"},
	{name: "suffix"},
	{name: "command"},
	{name: "platform"}
];

/*
Run the macro
*/
exports.run = function(shortcuts,prefix,separator,suffix,command,platform) {
	var shortcutArray = $tw.keyboardManager.getPrintableShortcuts($tw.keyboardManager.parseKeyDescriptors(shortcuts,{
		wiki: this.wiki
	}));
	if(shortcutArray.length > 0) {
		shortcutArray.sort(function(a,b) {
		    return a.toLowerCase().localeCompare(b.toLowerCase());
		})
		return prefix + shortcutArray.join(separator) + suffix;
	} else if(command && platform) {
		if(platform === "All" || platform === "Linux" || platform === "Mac" || platform === "Windows") {
			var keymap = $tw.utils.codemirror["keymap" + platform];
			var kbShortcuts = keymap[command] || (platform === "All" ? $tw.utils.codemirror.keymap[command] : undefined);
			if(kbShortcuts) {
				return prefix + kbShortcuts.join(separator) + suffix;
			}
		}
	} else {
		return "";
	}
};

})();