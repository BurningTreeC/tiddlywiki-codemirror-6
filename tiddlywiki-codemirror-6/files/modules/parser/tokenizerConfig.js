/*\
title: $:/plugins/BTC/tiddlywiki-codemirror-6/modules/parser/tokenizerConfig.js
type: application/javascript
module-type: library

Configuration for tokenizer, specifying which attributes contain filters.

\*/
(function() {
    "use strict";

    /**
     * List of attributes that contain filter expressions.
     * Format: { widgetType: [ "attribute1", "attribute2", ... ] }
     * If widgetType is "generic", it applies to all non-definition widgets and HTML elements.
     */
    var filterAttributes = {
        "generic": ["filter"],
        "\\function": ["value"],
        "\\procedure": ["value"],
        "\\define": ["value"],
        "\\widget": ["value"]
        // Add more widget types and their filter-containing attributes as needed
    };

    /**
     * Function to retrieve filter-containing attributes for a given widget type.
     * @param {String} widgetType - The type of the widget (e.g., "\\function") or "generic".
     * @returns {Array} - Array of attribute names that contain filters.
     */
    function getFilterAttributes(widgetType) {
        var specific = filterAttributes[widgetType];
        var generic = filterAttributes["generic"] || [];
        return specific ? specific.concat(generic) : generic.slice(); // Use slice() to return a copy
    }

    /**
     * Export the configuration.
     */
    exports.filterAttributes = filterAttributes;
    exports.getFilterAttributes = getFilterAttributes;

})();
