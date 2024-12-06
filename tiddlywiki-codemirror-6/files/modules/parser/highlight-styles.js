/*\
title: $:/plugins/BTC/tiddlywiki-codemirror-6/modules/parser/highlight-styles.js
type: application/javascript
module-type: library

Highlight styles for syntax highlighting.

\*/
(function() {
    "use strict";

    var Dependencies = require("$:/plugins/BTC/tiddlywiki-codemirror-6/lib/codemirror-dependencies.js").CodeMirrorDependencies;

    /**
     * Defines the highlight styles for different token types.
     * @returns {Object} - The highlight style object.
     */
    function defineHighlightStyles() {
        return Dependencies.language.HighlightStyle.define([
            { tag: "tw-heading", class: "tw-heading" },
            { tag: "tw-bold", class: "tw-bold" },
            { tag: "tw-italic", class: "tw-italic" },
            { tag: "tw-list", class: "tw-list" },
            { tag: "tw-list-item", class: "tw-list-item" },
            { tag: "tw-paragraph", class: "tw-paragraph" },
            { tag: "tw-link", class: "tw-link" },
            { tag: "tw-element", class: "tw-element" },
            { tag: "tw-text", class: "tw-text" },
            { tag: "tw-set", class: "tw-set" },
            { tag: "tw-function-definition", class: "tw-function-definition" },
            { tag: "tw-procedure-definition", class: "tw-procedure-definition" },
            { tag: "tw-macro-definition", class: "tw-macro-definition" },
            { tag: "tw-filter-operator", class: "tw-filter-operator" },
            { tag: "tw-filter-function", class: "tw-filter-function" },
            { tag: "tw-filter-variable", class: "tw-filter-variable" },
            { tag: "tw-filter-literal", class: "tw-filter-literal" },
            { tag: "tw-filter-subfilter", class: "tw-filter-subfilter" }
        ]);
    }

    // Export the highlight style
    exports.defineHighlightStyles = defineHighlightStyles;

})();
