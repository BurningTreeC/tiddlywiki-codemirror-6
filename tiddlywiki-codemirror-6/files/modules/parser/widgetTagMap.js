/*\
title: $:/plugins/BTC/tiddlywiki-codemirror-6/modules/parser/widgetTagMap.js
type: application/javascript
module-type: library

Mapping of TiddlyWiki5 core widgets to their corresponding token types for syntax highlighting.

\*/
(function() {
    "use strict";

    /**
     * Mapping of widget tags to specific token types.
     * Extend this object to handle more widget types as needed.
     */
    var widgetTagMap = {
        // Action Widgets
        "action-confirm": "tw-action-confirm-widget",
        "action-createtiddler": "tw-action-createtiddler-widget",
        "action-deletefield": "tw-action-deletefield-widget",
        "action-deletetiddler": "tw-action-deletetiddler-widget",
        "action-listops": "tw-action-listops-widget",
        "action-log": "tw-action-log-widget",
        "action-navigate": "tw-action-navigate-widget",
        "action-popup": "tw-action-popup-widget",
        "action-sendmessage": "tw-action-sendmessage-widget",
        "action-setfield": "tw-action-setfield-widget",
        "action-setmultiplefields": "tw-action-setmultiplefields-widget",

        // UI Widgets
        "browse": "tw-browse-widget",
        "button": "tw-button-widget",
        "checkbox": "tw-checkbox-widget",
        "codeblock": "tw-codeblock-widget",
        "count": "tw-count-widget",
        "data": "tw-data-widget",
        "diff-text": "tw-diff-text-widget",
        "draggable": "tw-draggable-widget",
        "droppable": "tw-droppable-widget",
        "dropzone": "tw-dropzone-widget",
        "edit-bitmap": "tw-edit-bitmap-widget",
        "edit-text": "tw-edit-text-widget",
        "edit": "tw-edit-widget",
        "encrypt": "tw-encrypt-widget",
        "entity": "tw-entity-widget",
        "error": "tw-error-widget",
        "eventcatcherwidget": "tw-eventcatcherwidget-widget",
        "fieldmangler": "tw-fieldmangler-widget",
        "fields": "tw-fields-widget",
        "fill": "tw-fill-widget",
        "genesis": "tw-genesis-widget",
        "image": "tw-image-widget",
        "importvariables": "tw-importvariables-widget",
        "jsontiddler": "tw-jsontiddler-widget",
        "keyboard": "tw-keyboard-widget",
        "let": "tw-let-widget",
        "linkcatcher": "tw-linkcatcher-widget",
        "link": "tw-link-widget",
        "list": "tw-list-widget",
        "logwidget": "tw-logwidget-widget",
        "macrocall": "tw-macrocall-widget",
        "messagecatcherwidget": "tw-messagecatcherwidget-widget",
        "messagehandlerwidgets": "tw-messagehandlerwidgets-widget",
        "navigator": "tw-navigator-widget",
        "parameters": "tw-parameters-widget",
        "password": "tw-password-widget",
        "vars": "tw-vars-widget",
        "radio": "tw-radio-widget",
        "range": "tw-range-widget",
        "reveal": "tw-reveal-widget",
        "scrollable": "tw-scrollable-widget",
        "select": "tw-select-widget",
        "setmultiplevariables": "tw-setmultiplevariables-widget",
        "setvariable": "tw-setvariable-widget",
        "set": "tw-set-widget", // Mapping for <$set> widget
        "slot": "tw-slot-widget",
        "testcase": "tw-testcase-widget",
        "text": "tw-text-widget",
        "tiddler": "tw-tiddler-widget",
        "transclude": "tw-transclude-widget",
        "triggeringwidgets": "tw-triggeringwidgets-widget",
        "view": "tw-view-widget",
        "wikify": "tw-wikify-widget",

        // Definition Widgets
        "procedure": "tw-procedure-widget",
        "function": "tw-function-widget",
        "define": "tw-define-widget",

        // New Widget Definition
        "widget": "tw-widget-widget" // Mapping for \widget
    };

    /**
     * Export the widgetTagMap for external use.
     */
    exports.widgetTagMap = widgetTagMap;

})();
