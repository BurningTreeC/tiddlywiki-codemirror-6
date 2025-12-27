/*\
title: $:/plugins/BTC/tiddlywiki-codemirror-6/modules/editor/operations/text/redo.js
type: application/javascript
module-type: texteditoroperation

Text editor operation: redo

Production-ready refactor:
- uses Array.isArray
- supports both multi-selection array shape and single operation object shape
- avoids relying on local reassignment that won't propagate
- keeps backward compatibility with engines that check operation.type

\*/

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

exports.redo = function (event, operation) {
	// Engine recognizes operations.type === "redo" and calls CM redo().
	if (Array.isArray(operation)) {
		operation.length = 0;
		operation.type = "redo";
		return;
	}

	if (operation && typeof operation === "object") {
		operation.type = "redo";
		operation.cutStart = null;
		operation.cutEnd = null;
		operation.replacement = null;
		operation.newSelStart = null;
		operation.newSelEnd = null;
	}
};
