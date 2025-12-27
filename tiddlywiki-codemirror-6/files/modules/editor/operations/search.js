/*\
title: $:/plugins/BTC/tiddlywiki-codemirror-6/modules/editor/operations/text/search.js
type: application/javascript
module-type: texteditoroperation

Text editor operation: open/close search panel (engine decides toggle)

Production-ready refactor:
- uses Array.isArray
- supports both multi-selection array shape and single operation object shape
- avoids relying on local reassignment that won't propagate
- keeps backward compatibility with engines that check operation.type

\*/

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

exports.search = function (event, operation) {
	// Engine recognizes operations.type === "search" and toggles the CM search panel.
	if (Array.isArray(operation)) {
		operation.length = 0;
		operation.type = "search";
		return;
	}

	if (operation && typeof operation === "object") {
		operation.type = "search";
		operation.cutStart = null;
		operation.cutEnd = null;
		operation.replacement = null;
		operation.newSelStart = null;
		operation.newSelEnd = null;
	}
};
