/*\
title: $:/plugins/BTC/tiddlywiki-codemirror-6/modules/parser/updateAutocompletion.js
type: application/javascript
module-type: library

Submodule for updating autocompletion lists dynamically.

\*/
(function() {
"use strict";

// Require the populateLists function from populateLists.js
var populateLists = require("$:/plugins/BTC/tiddlywiki-codemirror-6/modules/parser/populateLists.js").populateLists;

/**
 * Safely deletes all enumerable, configurable properties from an object,
 * excluding any specified keys (e.g., 'length').
 * @param {Object} obj - The object from which to delete properties.
 * @param {Array} excludeKeys - An array of property names to exclude from deletion.
 */
function safeDeleteProperties(obj, excludeKeys = []) {
    Object.keys(obj).forEach(function(key) {
        if (excludeKeys.includes(key)) {
            // Skip deletion for excluded keys
            return;
        }
        var descriptor = Object.getOwnPropertyDescriptor(obj, key);
        if (descriptor && descriptor.configurable) {
            try {
                delete obj[key];
            } catch (e) {
                console.warn(`Failed to delete property '${key}':`, e);
            }
        }
    });
}

/**
 * Debounce function to limit the rate of function execution.
 * @param {Function} func - The function to debounce.
 * @param {number} delay - The delay in milliseconds.
 * @returns {Function} - The debounced function.
 */
function debounce(func, delay) {
    var timeout;
    return function() {
        var context = this, args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(function() {
            func.apply(context, args);
        }, delay);
    };
}

/**
 * Updates the autocompletion lists dynamically by clearing and repopulating them.
 * This function ensures that read-only properties like 'length' are not modified.
 * @param {Object} widgets - The widgets object to update.
 * @param {Object} filterOperators - The filterOperators object to update.
 * @param {Object} filterFunctions - The filterFunctions object to update.
 * @param {Object} tiddlers - The tiddlers object to update.
 * @param {Object} tags - The tags object to update.
 * @param {Object} attributes - The attributes object to update.
 */
function updateAutocompletionLists(widgets, filterOperators, filterFunctions, tiddlers, tags, attributes) {
    // Define keys to exclude from deletion to prevent modifying read-only properties
    var excludeKeys = ['length'];

    // Safely delete properties from each target object
    safeDeleteProperties(widgets, excludeKeys);
    safeDeleteProperties(filterOperators, excludeKeys);
    safeDeleteProperties(filterFunctions, excludeKeys);
    safeDeleteProperties(tiddlers, excludeKeys);
    safeDeleteProperties(tags, excludeKeys);
    safeDeleteProperties(attributes, excludeKeys);

    // Repopulate lists by invoking populateLists
    try {
        populateLists(widgets, filterOperators, filterFunctions, tiddlers, tags, attributes);
        
        // After population, ensure 'length' is not present
        if ('length' in widgets) delete widgets.length;
        if ('length' in filterOperators) delete filterOperators.length;
        if ('length' in filterFunctions) delete filterFunctions.length;
        if ('length' in tiddlers) delete tiddlers.length;
        if ('length' in tags) delete tags.length;
        if ('length' in attributes) delete attributes.length;

    } catch (e) {
        console.error("Failed to repopulate autocompletion lists:", e);
    }
}

// Create a debounced version of updateAutocompletionLists
var debouncedUpdateAutocompletionLists = debounce(updateAutocompletionLists, 300); // 300ms delay

/**
 * Registers event listeners to update autocompletion lists dynamically.
 * This ensures that any changes in tiddlers, widgets, or other components are reflected in autocompletion suggestions.
 * @param {Object} widgets - The widgets object to update.
 * @param {Object} filterOperators - The filterOperators object to update.
 * @param {Object} filterFunctions - The filterFunctions object to update.
 * @param {Object} tiddlers - The tiddlers object to update.
 * @param {Object} tags - The tags object to update.
 * @param {Object} attributes - The attributes object to update.
 */
function registerDynamicUpdates(widgets, filterOperators, filterFunctions, tiddlers, tags, attributes) {
    // Listen for changes in tiddlers
    $tw.hooks.addHook("th-patch-tiddler", function(patch, title, oldTiddler, newTiddler) {
        // Update tiddlers and tags
        if (patch.fields.title) {
            tiddlers[newTiddler.fields.title] = true;
            delete tiddlers[oldTiddler.fields.title];
        }
        if (patch.fields.tags) {
            // Remove old tags
            if (oldTiddler.fields.tags) {
                oldTiddler.fields.tags.forEach(function(tag) {
                    delete tags[tag];
                });
            }
            // Add new tags
            if (newTiddler.fields.tags) {
                newTiddler.fields.tags.forEach(function(tag) {
                    tags[tag] = true;
                });
            }
        }
        // Update attributes or other fields if necessary
        // ...

        // Trigger a debounced refresh of autocompletion lists
        debouncedUpdateAutocompletionLists(widgets, filterOperators, filterFunctions, tiddlers, tags, attributes);
    });

    // Listen for addition/removal of widgets, filter operators, etc.
    $tw.hooks.addHook("th-imported-modules", function(type, module) {
        if (type === "widget" && module.name) {
            widgets[module.name] = true;
        }
        if (type === "filteroperator" && module.name) {
            filterOperators[module.name] = true;
        }
        if (type === "filterfunction" && module.name) {
            filterFunctions[module.name] = true;
        }

        // Trigger a debounced refresh of autocompletion lists
        debouncedUpdateAutocompletionLists(widgets, filterOperators, filterFunctions, tiddlers, tags, attributes);
    });

    $tw.hooks.addHook("th-unloaded-module", function(type, module) {
        if (type === "widget" && module.name) {
            delete widgets[module.name];
        }
        if (type === "filteroperator" && module.name) {
            delete filterOperators[module.name];
        }
        if (type === "filterfunction" && module.name) {
            delete filterFunctions[module.name];
        }

        // Trigger a debounced refresh of autocompletion lists
        debouncedUpdateAutocompletionLists(widgets, filterOperators, filterFunctions, tiddlers, tags, attributes);
    });
}

// Initialize dynamic updates with initial autocompletion lists
registerDynamicUpdates(widgets, filterOperators, filterFunctions, tiddlers, tags, attributes);

// Export the updateAutocompletionLists function
exports.updateAutocompletionLists = updateAutocompletionLists;

})();
