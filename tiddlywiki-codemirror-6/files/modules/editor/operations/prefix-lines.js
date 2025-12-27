/*\
title: $:/core/modules/editor/operations/text/prefix-lines.js
type: application/javascript
module-type: texteditoroperation

Text editor operation to add a prefix to the selected lines

Production-ready refactor:
- hardening for missing event/paramObject/character/count
- consistent behavior for single + multi selection
- uses Array.isArray instead of instanceof Array
- avoids duplicated logic via helpers
- stable selection math even with missing selStart/selEnd/text
- preserves original semantics: toggles prefix on lines; if exactly targetCount removed -> no prefix re-added

\*/

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

function getParams(event) {
	var p = (event && event.paramObject) ? event.paramObject : {};
	var ch = (p.character !== undefined && p.character !== null) ? String(p.character) : "";
	// If character is empty, nothing useful can be done; choose a safe default
	if (!ch) ch = ">";

	var countRaw = parseInt(String(p.count), 10);
	var targetCount = (isFinite(countRaw) && countRaw > 0) ? countRaw : 1;

	return { character: ch, targetCount: targetCount };
}

function safePos(n, fallback) {
	return (isFinite(n) && n >= 0) ? n : fallback;
}

function processOperation(op, character, targetCount) {
	var text = (op && typeof op.text === "string") ? op.text : "";
	var selStart = safePos(op && op.selStart, 0);
	var selEnd = safePos(op && op.selEnd, selStart);

	// Cut to whole lines around the selection
	op.cutStart = $tw.utils.findPrecedingLineBreak(text, selStart);
	op.cutEnd = $tw.utils.findFollowingLineBreak(text, selEnd);

	var prefix = $tw.utils.repeat(character, targetCount);

	// Split lines (normalize CRLF)
	var segment = text.substring(op.cutStart, op.cutEnd);
	var lines = segment.split(/\r?\n/mg);

	for (var i = 0; i < lines.length; i++) {
		var line = lines[i];

		// Remove and count any existing prefix characters
		var removed = 0;
		while ($tw.utils.startsWith(line, character)) {
			line = line.substring(character.length);
			removed++;
		}

		// Remove any leading spaces (original behavior: only spaces, not tabs)
		while (line.charAt(0) === " ") {
			line = line.substring(1);
		}

		// If we removed exactly targetCount, leave it unprefixed; otherwise add prefix
		if (removed !== targetCount) {
			line = prefix + " " + line;
		}

		lines[i] = line;
	}

	op.replacement = lines.join("\n");

	// Selection semantics: single line => caret at end; multi-line => select whole block
	if (lines.length === 1) {
		op.newSelStart = op.cutStart + op.replacement.length;
		op.newSelEnd = op.newSelStart;
	} else {
		op.newSelStart = op.cutStart;
		op.newSelEnd = op.cutStart + op.replacement.length;
	}
}

exports["prefix-lines"] = function (event, operation) {
	var params = getParams(event);

	if (Array.isArray(operation)) {
		for (var i = 0; i < operation.length; i++) {
			processOperation(operation[i], params.character, params.targetCount);
		}
		return;
	}

	if (operation && typeof operation === "object") {
		processOperation(operation, params.character, params.targetCount);
	}
};
