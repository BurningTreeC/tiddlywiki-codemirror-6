/*\
title: $:/core/modules/editor/operations/text/excise.js
type: application/javascript
module-type: texteditoroperation

Text editor operation to excise the selection to a new tiddler

Production-ready refactor:
- hardening against missing edit tiddler / missing fields / missing paramObject
- consistent title generation (always uses generateNewTitle when user provides a base)
- correct default base title usage
- correct markdown detection even when editTiddler missing
- stable behavior for multi-selection + single selection
- avoids duplicated logic via helpers

\*/

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

function isMarkdown(mediaType) {
	return mediaType === "text/markdown" || mediaType === "text/x-markdown";
}

function getDraftOfOrTitle(editTiddler, fallbackTitle) {
	if (editTiddler && editTiddler.fields && editTiddler.fields["draft.of"]) {
		return editTiddler.fields["draft.of"];
	}
	return fallbackTitle;
}

function getWikiLinksAllowed(editTiddler) {
	// If no tiddler or no type, assume TiddlyWiki text => wiki links allowed
	var type = (editTiddler && editTiddler.fields) ? editTiddler.fields.type : undefined;
	return !isMarkdown(type);
}

function getParamObject(event) {
	return (event && event.paramObject) ? event.paramObject : {};
}

function getExcisionBaseTitle(paramObject) {
	// If user provides a base title, use it as base (still generateNewTitle to avoid collisions)
	if (paramObject.title && paramObject.title !== "") {
		return paramObject.title;
	}
	// Otherwise use localized default if available, else a sensible fallback
	try {
		return $tw.language.getString("Buttons/Excise/DefaultTitle") || "New Excision";
	} catch (e) {
		return "New Excision";
	}
}

function makeReplacement(rawTitle, type, wikiLinks, macroName) {
	switch (type || "transclude") {
		case "transclude":
			return "{{" + rawTitle + "}}";
		case "link":
			// For markdown: emit markdown link; for TW: use wikilink
			return wikiLinks ? "[[" + rawTitle + "]]" : ("[" + rawTitle + "](<#" + rawTitle + ">)");
		case "macro":
			return "<<" + (macroName || "translink") + " \"\"\"" + rawTitle + "\"\"\">>";
		default:
			// Unknown: safest is transclude
			return "{{" + rawTitle + "}}";
	}
}

function addExcisionTiddler(wiki, title, text, tagNew, tagTitle) {
	wiki.addTiddler(new $tw.Tiddler(
		wiki.getCreationFields(),
		wiki.getModificationFields(),
		{
			title: title,
			text: text,
			tags: tagNew ? [tagTitle] : []
		}
	));
}

function applyOperationEdits(op, from, to, replacement) {
	op.replacement = replacement;
	op.cutStart = from;
	op.cutEnd = to;
	op.newSelStart = from;
	op.newSelEnd = from + replacement.length;
}

exports.excise = function (event, operation) {
	var paramObject = getParamObject(event);

	var editTiddler = this.wiki.getTiddler(this.editTitle);
	var editTiddlerTitle = getDraftOfOrTitle(editTiddler, this.editTitle);

	var wikiLinks = getWikiLinksAllowed(editTiddler);
	var baseTitle = getExcisionBaseTitle(paramObject);

	var tagNew = (paramObject.tagnew === "yes");
	var replacementType = paramObject.type || "transclude";
	var macroName = paramObject.macro;

	// Normalize to an array for unified handling
	var ops = Array.isArray(operation) ? operation : [operation];

	for (var i = 0; i < ops.length; i++) {
		var op = ops[i];

		// Hardening: tolerate weird ops
		var selectionText = (op && typeof op.selection === "string") ? op.selection : "";

		// Title: always generate unique title. If user gave a base title, treat it as base, not exact.
		var excisionTitle = this.wiki.generateNewTitle(baseTitle);

		addExcisionTiddler(this.wiki, excisionTitle, selectionText, tagNew, editTiddlerTitle);

		var replacement = makeReplacement(excisionTitle, replacementType, wikiLinks, macroName);

		// For multi-selection ops use selStart/selEnd on each op
		var from = op.selStart;
		var to = op.selEnd;

		// Hardening: if missing numeric positions, do no-op-safe positions
		if (!isFinite(from) || !isFinite(to)) {
			from = 0;
			to = 0;
		}

		applyOperationEdits(op, from, to, replacement);
	}

	// If original operation was a single object, we modified it in-place already.
};
