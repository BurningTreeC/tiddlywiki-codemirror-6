/*\
title: $:/plugins/BTC/tiddlywiki-codemirror-6/lib/codemirror-dependencies.js
type: application/javascript
module-type: library

codemirror dependencies

\*/

(function(){

if($tw.browser && !window.CM) {
    require("$:/plugins/BTC/tiddlywiki-codemirror-6/lib/codemirror.js");
}

var CodeMirrorDependencies = {
    state: {
        EditorState: CM["@codemirror/state"].EditorState,
        EditorSelection: CM["@codemirror/state"].EditorSelection,
        Prec: CM["@codemirror/state"].Prec,
        Facet: CM["@codemirror/state"].Facet,
        StateField: CM["@codemirror/state"].StateField,
        StateEffect: CM["@codemirror/state"].StateEffect,
        Compartment: CM["@codemirror/state"].Compartment,
        allowMultipleSelections: CM["@codemirror/state"].EditorState.allowMultipleSelections,
        RangeSet: CM["@codemirror/state"].RangeSet,
        RangeSetBuilder: CM["@codemirror/state"].RangeSetBuilder
    },
    view: {
        EditorView: CM["@codemirror/view"].EditorView,
        ViewPlugin: CM["@codemirror/view"].ViewPlugin,
        dropCursor: CM["@codemirror/view"].dropCursor,
        keymap: CM["@codemirror/view"].keymap,
        highlightSpecialChars: CM["@codemirror/view"].highlightSpecialChars,
        drawSelection: CM["@codemirror/view"].drawSelection,
        highlightActiveLine: CM["@codemirror/view"].highlightActiveLine,
        rectangularSelection: CM["@codemirror/view"].rectangularSelection,
        crosshairCursor: CM["@codemirror/view"].crosshairCursor,
        lineNumbers: CM["@codemirror/view"].lineNumbers,
        highlightActiveLineGutter: CM["@codemirror/view"].highlightActiveLineGutter,
        placeholder: CM["@codemirror/view"].placeholder,
        tooltips: CM["@codemirror/view"].tooltips,
        showPanel: CM["@codemirror/view"].showPanel,
        getPanel: CM["@codemirror/view"].getPanel,
        Decoration: CM["@codemirror/view"].Decoration,
        WidgetType: CM["@codemirror/view"].WidgetType
    },
    commands: {
        defaultKeymap: CM["@codemirror/commands"].defaultKeymap,
        standardKeymap: CM["@codemirror/commands"].standardKeymap,
        indentWithTab: CM["@codemirror/commands"].indentWithTab,
        history: CM["@codemirror/commands"].history,
        historyKeymap: CM["@codemirror/commands"].historyKeymap,
        undo: CM["@codemirror/commands"].undo,
        redo: CM["@codemirror/commands"].redo
    },
    language: {
        language: CM["@codemirror/language"].language,
        indentUnit: CM["@codemirror/language"].indentUnit,
        defaultHighlightStyle: CM["@codemirror/language"].defaultHighlightStyle,
        syntaxHighlighting: CM["@codemirror/language"].syntaxHighlighting,
        indentOnInput: CM["@codemirror/language"].indentOnInput,
        bracketMatching: CM["@codemirror/language"].bracketMatching,
        foldGutter: CM["@codemirror/language"].foldGutter,
        foldKeymap: CM["@codemirror/language"].foldKeymap,
        syntaxTree: CM["@codemirror/language"].syntaxTree,
        LanguageSupport: CM["@codemirror/language"].LanguageSupport,
        Language: CM["@codemirror/language"].Language,
        defineLanguageFacet: CM["@codemirror/language"].defineLanguageFacet,
        LRLanguage: CM["@codemirror/language"].LRLanguage,
        StreamLanguage: CM["@codemirror/language"].StreamLanguage,
        HighlightStyle: CM["@codemirror/language"].HighlightStyle
    },
    search: {
        search: CM["@codemirror/search"].search,
        SearchQuery: CM["@codemirror/search"].SearchQuery,
        searchKeymap: CM["@codemirror/search"].searchKeymap,
        highlightSelectionMatches: CM["@codemirror/search"].highlightSelectionMatches,
        openSearchPanel: CM["@codemirror/search"].openSearchPanel,
        closeSearchPanel: CM["@codemirror/search"].closeSearchPanel,
        searchPanelOpen: CM["@codemirror/search"].searchPanelOpen,
        gotoLine: CM["@codemirror/search"].gotoLine
    },
    autocomplete: {
        autocompletion: CM["@codemirror/autocomplete"].autocompletion,
        completionKeymap: CM["@codemirror/autocomplete"].completionKeymap,
        closeBrackets: CM["@codemirror/autocomplete"].closeBrackets,
        closeBracketsKeymap: CM["@codemirror/autocomplete"].closeBracketsKeymap,
        completionStatus: CM["@codemirror/autocomplete"].completionStatus,
        acceptCompletion: CM["@codemirror/autocomplete"].acceptCompletion,
        completeAnyWord: CM["@codemirror/autocomplete"].completeAnyWord
    },
    lezerHighlight: {
        Tag: CM["@lezer/highlight"].Tag,
        tags: CM["@lezer/highlight"].tags
    }
};


// Verify that none of the required modules are undefined
for (let section in CodeMirrorDependencies) {
    for (let key in CodeMirrorDependencies[section]) {
        if (CodeMirrorDependencies[section][key] === undefined) {
            console.error(`CodeMirrorDependencies.${section}.${key} is undefined.`);
        }
    }
}

// Export the dependencies
exports.CodeMirrorDependencies = CodeMirrorDependencies;

})();
