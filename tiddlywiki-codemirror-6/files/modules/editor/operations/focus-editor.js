/*\
title: $:/core/modules/editor/operations/text/focus-editor.js
type: application/javascript
module-type: texteditoroperation

Simply focus the Text editor

Production-ready refactor:
- supports both single- and multi-selection operation shapes without relying on instanceof Array
- avoids surprising reassignments that don't affect caller references
- keeps backward-compatible behavior: for multi-selection, clears ops + sets marker type;
  for single-selection, converts into a marker operation (instead of setting local var to null)

\*/

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

exports["focus-editor"] = function (event, operation) {
	// The engine treats operations with type === "focus-editor" as a no-change command and just focuses.
	// To keep behavior stable across operation shapes, we normalize into that marker.

	if (Array.isArray(operation)) {
		// Clear any per-selection operations and mark as focus-only
		operation.length = 0;
		operation.type = "focus-editor";
		return;
	}

	// If it's an object, mark it as focus-only so the engine can recognize it reliably.
	// (Setting operation = null here would NOT propagate to the caller.)
	if (operation && typeof operation === "object") {
		operation.type = "focus-editor";
		operation.cutStart = null;
		operation.cutEnd = null;
		operation.replacement = null;
		operation.newSelStart = null;
		operation.newSelEnd = null;
		return;
	}

	// If it's something unexpected, do nothing (hardening)
};
