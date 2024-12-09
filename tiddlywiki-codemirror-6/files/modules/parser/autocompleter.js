/*\
title: $:/plugins/BTC/tiddlywiki-codemirror-6/modules/parser/autocompleter.js
type: application/javascript
module-type: library

Autocompleter module for providing autocompletion suggestions in CodeMirror based on TiddlyWiki context.

\*/
(function() {
    "use strict";

    /**
     * Autocompleter module utilizing TiddlyWiki's internal functions to provide suggestions.
     */

    /**
     * Provides autocomplete suggestions based on the current context.
     * @param {Object} context - The autocompletion context from CodeMirror.
     * @returns {Object|null} - The autocompletion options or null.
     */
    function tiddlyWikiAutocomplete(context) {
        var word = context.matchBefore(/\w*/);
        if (word.from == word.to && !context.explicit) return null;
        var suggestions = [];

        // Example: Suggest widget names
        var widgetTags = Object.keys(require("$:/plugins/BTC/tiddlywiki-codemirror-6/modules/parser/widgetTagMap.js").widgetTagMap);
        for (var i = 0; i < widgetTags.length; i++) {
            suggestions.push({
                label: widgetTags[i],
                type: "widget",
                info: "Insert $" + widgetTags[i] + " widget"
            });
        }

        // Example: Suggest HTML tags
        var htmlTags = Object.keys(require("$:/plugins/BTC/tiddlywiki-codemirror-6/modules/parser/elementTagMap.js").elementTagMap);
        for (var j = 0; j < htmlTags.length; j++) {
            suggestions.push({
                label: htmlTags[j],
                type: "element",
                info: "Insert <" + htmlTags[j] + "> element"
            });
        }

        return {
            from: word.from,
            options: suggestions,
            validFor: /^\w*$/
        };
    }

    /**
     * Export the autocompletion function for external use.
     */
    exports.tiddlyWikiAutocomplete = tiddlyWikiAutocomplete;

})();
