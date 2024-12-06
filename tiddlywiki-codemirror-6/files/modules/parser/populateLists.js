/*\
title: $:/plugins/BTC/tiddlywiki-codemirror-6/modules/parser/populateLists.js
type: application/javascript
module-type: library

Submodule for populating autocompletion lists.

\*/
(function(){
"use strict";

/**
 * Populates the autocompletion data structures by extracting information from TW5.
 * @param {Object} widgets - The widgets object to populate.
 * @param {Object} filterOperators - The filterOperators object to populate.
 * @param {Object} filterFunctions - The filterFunctions object to populate.
 * @param {Object} tiddlers - The tiddlers object to populate.
 * @param {Object} tags - The tags object to populate.
 * @param {Object} attributes - The attributes object to populate.
 */
function populateLists(widgets, filterOperators, filterFunctions, tiddlers, tags, attributes) {
    // Populate widgets, filterOperators, and filterFunctions using applyMethods
    $tw.modules.applyMethods("widget", widgets);
    $tw.modules.applyMethods("filteroperator", filterOperators);
    $tw.modules.applyMethods("filterfunction", filterFunctions);

    // Populate tiddlers and tags
    $tw.wiki.each(function(title) {
        var tiddler = $tw.wiki.getTiddler(title);
        if (tiddler) {
            tiddlers[title] = true;

            if (tiddler.fields.tags) {
                tiddler.fields.tags.forEach(function(tag) {
                    tags[tag] = true;
                });
            }
        }
    });

    // Populate attributes based on TW5's internal structures
    // Instead of reassigning, extend the existing attributes object
    Object.assign(attributes, {
        "name": true,
        "value": true,
        "tiddler": true,
        "field": true,
        "index": true,
        "tag": true,
        "type": true,
        "focus": true,
        "placeholder": true,
        "default": true,
        "class": true,
        "focusPopup": true,
        "rows": true,
        "minHeight": true,
        "tabindex": true,
        "size": true,
        "autoHeight": true,
        "filterMinLength": true,
        "refreshTitle": true,
        "selectionStateTitle": true,
        "cancelPopups": true,
        "configTiddlerFilter": true,
        "firstSearchFilterField": true,
        "secondSearchFilterField": true,
        // Add more as needed
    });

    // Ensure 'length' is not inadvertently added
    if ('length' in widgets) delete widgets.length;
    if ('length' in filterOperators) delete filterOperators.length;
    if ('length' in filterFunctions) delete filterFunctions.length;
    if ('length' in tiddlers) delete tiddlers.length;
    if ('length' in tags) delete tags.length;
    if ('length' in attributes) delete attributes.length;
}

// Export the populateLists function
exports.populateLists = populateLists;

})();
