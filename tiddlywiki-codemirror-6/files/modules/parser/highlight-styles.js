/*\
title: $:/plugins/BTC/tiddlywiki-codemirror-6/modules/parser/highlight-styles.js
type: application/javascript
module-type: library

Highlight Styles module defining styles for various token types.

\*/
(function() {
    "use strict";

    var Dependencies = require("$:/plugins/BTC/tiddlywiki-codemirror-6/lib/codemirror-dependencies.js").CodeMirrorDependencies;

    /**
     * Defines the highlight styles for different token types.
     * @returns {HighlightStyle} - The defined highlight styles.
     */
    function defineHighlightStyles() {
        return Dependencies.language.HighlightStyle.define([
            { tag: "tw-definition-keyword", class: "cm-tw-definition-keyword" },
            { tag: "tw-definition-name", class: "cm-tw-definition-name" },
            { tag: "tw-definition-params", class: "cm-tw-definition-params" },
            { tag: "tw-definition-value", class: "cm-tw-definition-value" },
            { tag: "tw-attribute-name", class: "cm-tw-attribute-name" },
            { tag: "tw-attribute-value", class: "cm-tw-attribute-value" },
            { tag: "tw-filter-operator", class: "cm-tw-filter-operator" },
            { tag: "tw-filter-tiddler", class: "cm-tw-filter-tiddler" },
            { tag: "tw-filter-string", class: "cm-tw-filter-string" },
            { tag: "tw-filter-keyword", class: "cm-tw-filter-keyword" },
            { tag: "tw-filter-number", class: "cm-tw-filter-number" },
            { tag: "tw-filter-variable", class: "cm-tw-filter-variable" },
            { tag: "tw-text", class: "cm-tw-text" },
            { tag: "tw-h1-element", class: "cm-tw-h1-element" },
            { tag: "tw-h2-element", class: "cm-tw-h2-element" },
            { tag: "tw-h3-element", class: "cm-tw-h3-element" },
            // Add styles for other heading levels and elements as needed
            { tag: "tw-list-widget", class: "cm-tw-list-widget" },
            { tag: "tw-button-widget", class: "cm-tw-button-widget" },
            { tag: "tw-macro-widget", class: "cm-tw-macro-widget" },
            { tag: "tw-function-widget", class: "cm-tw-function-widget" },
            { tag: "tw-procedure-widget", class: "cm-tw-procedure-widget" },
            { tag: "tw-widget-widget", class: "cm-tw-widget-widget" },
            { tag: "tw-div-element", class: "cm-tw-div-element" },
            // Add styles for other widget and element types as needed
        ]);
    }

    /**
     * Export the defineHighlightStyles function for external use.
     */
    exports.defineHighlightStyles = defineHighlightStyles;

})();
