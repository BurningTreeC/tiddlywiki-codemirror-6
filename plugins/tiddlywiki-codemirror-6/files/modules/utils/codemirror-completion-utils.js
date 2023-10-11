/*\
title: $:/plugins/BTC/tiddlywiki-codemirror-6/modules/utils/codemirror-completion-utils.js
type: application/javascript
module-type: codemirror-utils

\*/

(function() {


// TODO: look for configured prefixes for tiddler, widget, filter, maybe variables and filterrunprefix completions first
// When inserting the completion result, test if the prefix should be removed and test if there's a suffix that should also be removed
// view.sliceDoc(a,b)
exports.getTiddlerCompletions = function(widget,editorSelection,autoOpenOnTyping,completionMinLength,deleteAutoCompletePrefix,closeBrackets) {

	var tiddlerCompletions = function(context) {
		var matchBeforeRegex = widget.wiki.getTiddlerText("$:/config/codemirror-6/autocompleteRegex");
		var matchBeforePrefix = widget.wiki.getTiddlerText("$:/config/codemirror-6/autocompleteRegexPrefix").replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		var word = (matchBeforeRegex && (matchBeforeRegex !== "") && $tw.utils.codemirror.validateRegex(matchBeforeRegex)) ? context.matchBefore(new RegExp(matchBeforeRegex)) : context.matchBefore(/[\w-/]*/); // /\w*/ or /[\w\s]+/
		var text = word ? word.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : "";
		var prefixBefore = (matchBeforePrefix && (matchBeforePrefix !== "")) && $tw.utils.codemirror.validateRegex(matchBeforePrefix + text) ? context.matchBefore(new RegExp(matchBeforePrefix + text)) : null;
		var prefixString;
		if(prefixBefore) {
			prefixString = prefixBefore.text.replace(text,"");
			prefixBefore.to = (prefixBefore.from + prefixString.length);
		}
		var isTiddlerCompletion = ($tw.utils.codemirror.validateRegex("\\\[([^\\\[\\\]\\\{\\\|])*(\\\[|\\\{)+([^\\\[\\\]\\\{\\\|]*(\\\]|\\\})[^\\\[\\\]\\\{\\\|]*(\\\[|\\\{))*" + text) ? context.matchBefore(new RegExp("\\\[([^\\\[\\\]\\\{\\\|])*(\\\[|\\\{)+([^\\\[\\\]\\\{\\\|]*(\\\]|\\\})[^\\\[\\\]\\\{\\\|]*(\\\[|\\\{))*" + text)) : null) !== null,
			isTransclusionCompletion = ((context.matchBefore(new RegExp("\\\{\\\{" + text)) !== null) && (context.matchBefore(new RegExp("\\\{\\\{\\\{" + text)) === null)),
			isFilterCompletion = ((context.matchBefore(new RegExp("\\\[" + text)) !== null) || (context.matchBefore(new RegExp("\\\]" + text)) !== null) || (context.matchBefore(new RegExp(">" + text)) !== null)),
			isWidgetCompletion = ((context.matchBefore(new RegExp("<\\\$" + text)) !== null) || (context.matchBefore(new RegExp("<\\\/\\\$" + text)) !== null)),
			isVariableCompletion = ((context.matchBefore(new RegExp("<" + text)) !== null) || (context.matchBefore(new RegExp("<<" + text)) !== null)),
			isFilterrunPrefixCompletion = context.matchBefore(new RegExp(":" + text)) !== null;
		/*if(word && !prefixBefore && !isLinkCompletion && !isTransclusionCompletion && !isWidgetCompletion && !isVariableCompletion && !isFilterCompletion && !isFilterrunPrefixCompletion && autoOpenOnTyping) {
			if ((word.text.length <= completionMinLength) && !context.explicit) { // || (word.from === word.to && !context.explicit)) { //(word.from === word.to && !context.explicit)) {
				return null;
			} else {
				console.log("1");
				return {
					from: word.from,
					options: $tw.utils.codemirror.getCompletionOptions(widget,editorSelection,context,word,text,deleteAutoCompletePrefix,prefixBefore,true,true,true,isFilterCompletion,isWidgetCompletion,isVariableCompletion,isFilterrunPrefixCompletion) //filter: false
				}
			}
		} else*/ if(word && context.explicit) {
			console.log("2");
			return {
				from: word.from,
				options: $tw.utils.codemirror.getCompletionOptions(widget,editorSelection,context,word,text,deleteAutoCompletePrefix,prefixBefore,true,true,true,true,true,true,true)
			}
		} else if(word && prefixBefore) {
			console.log("3");
			return {
				from: word.from,
				options: $tw.utils.codemirror.getTiddlerCompletionOptions(widget,editorSelection,context,word,text,deleteAutoCompletePrefix,prefixBefore,closeBrackets)
			}
		} else if(word && !isTiddlerCompletion && !isFilterCompletion && isWidgetCompletion) {
			console.log("4");
			return {
				from: word.from,
				options: $tw.utils.codemirror.getWidgetCompletionOptions(editorSelection,context,word,text)
			}
		} else if(word && !isTiddlerCompletion && isVariableCompletion) {
			console.log("5");
			return {
				from: word.from,
				options: $tw.utils.codemirror.getVariableCompletionOptions(widget,editorSelection,context,word,text)
			}
		} else if(word && !isTiddlerCompletion && isFilterCompletion) {
			console.log("6");
			return {
				from: word.from,
				options: $tw.utils.codemirror.getFilterCompletionOptions(editorSelection,context,word,text)
			}
		} else if(word && (isTiddlerCompletion || isTransclusionCompletion)) {
			console.log("7");
			return {
				from: word.from,
				options: $tw.utils.codemirror.getTiddlerCompletionOptions(widget,editorSelection,context,word,text,deleteAutoCompletePrefix,prefixBefore,closeBrackets)
			}
		}
	};

	return tiddlerCompletions;
};

exports.getTiddlerCompletionOptions = function(widget,editorSelection,context,word,text,deleteAutoCompletePrefix,prefixBefore,closeBrackets) {
	var options = [];
	var tiddlers = widget.wiki.filterTiddlers(widget.wiki.getTiddlerText("$:/config/codemirror-6/autocompleteTiddlerFilter"));
	var matchBeforeSystem = context.matchBefore(new RegExp("\\$:/" + text));
	var matchBeforeSystemAlmost = context.matchBefore(new RegExp("\\$:" + text));
	var matchBeforeDollar = context.matchBefore(new RegExp("\\$" + text));
	var matchBeforeSingleSquareBrackets = context.matchBefore(new RegExp("\\[" + text));
	var matchBeforeSingleRoundedBrackets = context.matchBefore(new RegExp("\\(" + text));
	var matchBeforeSingleLoopedBrackets = context.matchBefore(new RegExp("\\{" + text));
	var matchBeforeDoubleSquareBrackets = context.matchBefore(new RegExp("\\[\\[" + text));
	var matchBeforeDoubleRoundedBrackets = context.matchBefore(new RegExp("\\(\\(" + text));
	var matchBeforeDoubleLoopedBrackets = context.matchBefore(new RegExp("\\{\\{" + text));
	$tw.utils.each(tiddlers,function(tiddler) {
		options.push({label: tiddler, type: "cm-tiddler", boost: 99, apply: function(view,completion,from,to) {
			var docLength = view.state.doc.toString().length;
			var applyFrom,
				applyTo,
				apply;
			if(matchBeforeSystem && completion.label.startsWith("$:/")) {
				applyFrom = from - 3;
				apply = completion.label;
				applyTo = applyFrom + apply.length;
			} else if(matchBeforeSystemAlmost && completion.label.startsWith("$:/")) {
				applyFrom = from - 2;
				apply = completion.label;
				applyTo = applyFrom + apply.length;
			} else if(matchBeforeDollar && completion.label.startsWith("$:/")) {
				applyFrom = from - 1;
				apply = completion.label;
				applyTo = applyFrom + apply.length;
			} else if(matchBeforeSingleSquareBrackets && !matchBeforeDoubleSquareBrackets) {
				var matchingBracket = (docLength > to && view.state.sliceDoc(to,to + 1) === "]");
				applyFrom = from;
				apply = completion.label + (matchingBracket ? "" : "]");
				applyTo = matchingBracket ? applyFrom + apply.length + 1 : applyFrom + apply.length;
			} else if(matchBeforeSingleRoundedBrackets && !matchBeforeDoubleRoundedBrackets) {
				var matchingBracket = (docLength > to && view.state.sliceDoc(to,to + 1) === ")");
				applyFrom = from - 1;
				apply = completion.label;
				applyTo = matchingBracket ? applyFrom + apply.length + 1 : applyFrom + apply.length;
			} else if(matchBeforeSingleLoopedBrackets && !matchBeforeDoubleLoopedBrackets) {
				var matchingBracket = (docLength > to && view.state.sliceDoc(to,to + 1) === "}");
				applyFrom = from;
				apply = completion.label + (matchingBracket ? "" : "}");
				applyTo = matchingBracket ? applyFrom + apply.length + 1 : applyFrom + apply.length;
			} else if(matchBeforeDoubleSquareBrackets) {
				var matchingSingleBracket = (docLength > to && view.state.sliceDoc(to,to + 1) === "]");
				var matchingDoubleBracket = (docLength > (to + 1) && view.state.sliceDoc(to,to + 2) === "]]");
				applyFrom = from;
				apply = completion.label + (matchingSingleBracket && matchingDoubleBracket ? "" : matchingSingleBracket ? "]" : "]]");
				applyTo = matchingSingleBracket && matchingDoubleBracket ? applyFrom + apply.length + 2 : matchingSingleBracket ? applyFrom + apply.length + 1 : applyFrom + apply.length;
			} else if(matchBeforeDoubleRoundedBrackets) {
				var matchingSingleBracket = (docLength > to && view.state.sliceDoc(to,to + 1) === ")");
				var matchingDoubleBracket = (docLength > (to + 1) && view.state.sliceDoc(to,to + 2) === "))");
				applyFrom = from - 2;
				apply = completion.label;
				applyTo = matchingSingleBracket && matchingDoubleBracket ? applyFrom + apply.length + 2 : matchingSingleBracket ? applyFrom + apply.length + 1 : applyFrom + apply.length;
			} else if(matchBeforeDoubleLoopedBrackets) {
				var matchingSingleBracket = (docLength > to && view.state.sliceDoc(to,to + 1) === "}");
				var matchingDoubleBracket = (docLength > (to + 1) && view.state.sliceDoc(to,to + 2) === "}}");
				applyFrom = from;
				apply = completion.label + (matchingSingleBracket && matchingDoubleBracket ? "" : matchingSingleBracket ? "}" : "}}");
				applyTo = matchingSingleBracket && matchingDoubleBracket ? applyFrom + apply.length + 2 : matchingSingleBracket ? applyFrom + apply.length + 1 : applyFrom + apply.length;
			} else {
				applyFrom = from;
				apply = completion.label;
				applyTo = applyFrom + apply.length;
			}
			view.dispatch(view.state.changeByRange(function(range) {
				var editorChanges = [{from: applyFrom, to: to, insert: apply}];
				var selectionRange = editorSelection.range(applyTo,applyTo);
				return {
					changes: editorChanges,
					range: selectionRange
				}
			}));
			if(deleteAutoCompletePrefix && prefixBefore) {
				view.dispatch({changes: {from: prefixBefore.from, to: prefixBefore.to, insert: ""}});
			};
		}}); //section: "Tiddlers"
	});

	return options;
};

exports.getWidgetCompletionOptions = function(editorSelection,context,word,text) {
	var options = [];
	var widgetNames = [];
	$tw.utils.each($tw.modules.types["widget"],function(widget) {
		var widgetName = Object.getOwnPropertyNames(widget.exports);
		$tw.utils.each(widgetName,function(name) {
			widgetNames.push(name);
		});
	});
	var matchBeforeOpeningRegex = new RegExp("<\\$" + text);
	var matchBeforeClosingRegex = new RegExp("<\\/\\$" + text);
	var matchBeforeOpening = context.matchBefore(matchBeforeOpeningRegex);
	var matchBeforeClosing = context.matchBefore(matchBeforeClosingRegex);
	$tw.utils.each(widgetNames,function(widgetName) {
		options.push({label: widgetName, displayLabel: "<$" + widgetName + ">", type: "cm-widget", boost: 99, apply: function(view,completion,from,to) {
			var applyFrom,
				applyTo,
				apply;
			if(matchBeforeOpening) {
				applyFrom = from;
				apply = completion.label + " >";
				applyTo = applyFrom + apply.length - 1;
			} else if(matchBeforeClosing) {
				applyFrom = from;
				apply = completion.label + ">"
				applyTo = applyFrom + apply.length;
			} else {
				applyFrom = from;
				apply = "<$" + completion.label + " >";
				applyTo = applyFrom + apply.length;
			}
			view.dispatch(view.state.changeByRange(function(range) {
				var editorChanges = [{from: applyFrom, to: to, insert: apply}];
				var selectionRange = editorSelection.range(applyTo,applyTo);
				return {
					changes: editorChanges,
					range: selectionRange
				}
			}));
		}});
	});

	return options;
};

exports.getVariableCompletionOptions = function(widget,editorSelection,context,word,text) {
	var options = [];
	var variableNames = [];
	var widgetCopy = widget;
	while(widgetCopy && !widgetCopy.hasOwnProperty("variables")) {
		widgetCopy = widgetCopy.parentWidget;
	}
	if(widgetCopy && widgetCopy.variables) {
		for(var variable in widgetCopy.variables) {
			variableNames.push(variable);
		}
	}
	var matchBeforeDouble = context.matchBefore(new RegExp("<<" + text));
	var matchBeforeSingle = context.matchBefore(new RegExp("<" + text));
	$tw.utils.each(variableNames,function(variableName) {
		options.push({label: variableName, displayLabel: "<<" + variableName + ">>", type: "cm-variable", boost: 99, apply: function(view,completion,from,to) {
			var applyFrom,
				applyTo,
				apply;
			if(matchBeforeSingle && !matchBeforeDouble) {
				applyFrom = from - 1;
				apply = "<" + completion.label + ">";
			} else if(matchBeforeDouble) {
				applyFrom = from - 2;
				apply = "<<" + completion.label + ">>"
			} else {
				applyFrom = from;
				apply = "<<" + completion.label + ">>"
			}
			applyTo = applyFrom + apply.length;
			view.dispatch(view.state.changeByRange(function(range) {
				var editorChanges = [{from: applyFrom, to: to, insert: apply}];
				var selectionRange = editorSelection.range(applyTo,applyTo);
				return {
					changes: editorChanges,
					range: selectionRange
				}
			}));
		}});
	});

	return options;
};

exports.getFilterCompletionOptions = function(editorSelection,context,word,text) {
	var options = [];
	var filterNames = [];
	$tw.utils.each($tw.modules.types["filteroperator"],function(filteroperator) {
		var filterName = Object.getOwnPropertyNames(filteroperator.exports);
		$tw.utils.each(filterName,function(name) {
			filterNames.push(name);
		});
	});
	var indexOfUnknown = filterNames.indexOf("[unknown]");
	if(indexOfUnknown > -1) {
		filterNames.splice(indexOfUnknown, 1);
	}
	$tw.utils.each(filterNames,function(filterName) {
		options.push({label: filterName + "[]", type: "cm-filter", boost: 99, apply: function(view,completion,from,to) {
			view.dispatch(view.state.changeByRange(function(range) {
				var editorChanges = [{from: from, to: to, insert: completion.label}];
				var selectionRange = editorSelection.range(from + completion.label.length - 1,from + completion.label.length - 1);
				return {
					changes: editorChanges,
					range: selectionRange
				}
			}));
		}});
	});

	return options;
};

exports.getFilterrunprefixCompletionOptions = function(editorSelection,context,word,text) {
	var options = [];
	var filterPrefixNames = [];
	$tw.utils.each($tw.modules.types["filterrunprefix"],function(filterrunprefix) {
		var filterRunPrefixName = Object.getOwnPropertyNames(filterrunprefix.exports);
		$tw.utils.each(filterRunPrefixName,function(name) {
			filterPrefixNames.push(name);
		});
	});
	var matchBefore = context.matchBefore(new RegExp(":" + text));
	$tw.utils.each(filterPrefixNames,function(filterPrefixName) {
		options.push({label: filterPrefixName, displayLabel: ":" + filterPrefixName + "[]", type: "cm-filterrunprefix", boost: 99, apply: function(view,completion,from,to) {
			view.dispatch(view.state.changeByRange(function(range) {
				var applyFrom,
					applyTo,
					apply;
				if(matchBefore) {
					applyFrom = from;
					apply = completion.label + "[]";
				} else {
					applyFrom = from;
					apply = ":" + completion.label + "[]";
				}
				applyTo = applyFrom + apply.length - 1;
				var editorChanges = [{from: applyFrom, to: to, insert: apply}];
				var selectionRange = editorSelection.range(applyTo,applyTo);
				return {
					changes: editorChanges,
					range: selectionRange
				}
			}));
		}});
	});

	return options;
};

exports.getCompletionOptions = function(widget,editorSelection,context,word,text,deleteAutoCompletePrefix,prefixBefore,completeVariables,completeWidgets,completeFilters,isFilterCompletion,isWidgetCompletion,isVariableCompletion,isFilterrunPrefixCompletion) {
	var options = [];
	var tiddlerOptions = $tw.utils.codemirror.getTiddlerCompletionOptions(widget,editorSelection,context,word,text,deleteAutoCompletePrefix,prefixBefore);
	$tw.utils.each(tiddlerOptions,function(option) {
		options.push(option);
	});
	if(completeVariables && isVariableCompletion && !isFilterrunPrefixCompletion && !isWidgetCompletion) {
		var variableOptions = $tw.utils.codemirror.getVariableCompletionOptions(widget,editorSelection,context,word,text);
		$tw.utils.each(variableOptions,function(option) {
			options.push(option);
		});
	}
	if(completeWidgets && isWidgetCompletion) {
		var widgetOptions = $tw.utils.codemirror.getWidgetCompletionOptions(editorSelection,context,word,text);
		$tw.utils.each(widgetOptions,function(option) {
			options.push(option);
		});
	}
	if(completeFilters && isFilterCompletion && !isFilterrunPrefixCompletion && !isWidgetCompletion && !isVariableCompletion) {
		var filterOptions = $tw.utils.codemirror.getFilterCompletionOptions(editorSelection,context,word,text);
		$tw.utils.each(filterOptions,function(option) {
			options.push(option);
		});
	}
	if(completeFilters && isFilterrunPrefixCompletion && !isWidgetCompletion && !isFilterCompletion && !isVariableCompletion) {
		var filterrunprefixOptions = $tw.utils.codemirror.getFilterrunprefixCompletionOptions(editorSelection,context,word,text);
		$tw.utils.each(filterrunprefixOptions,function(option) {
			options.push(option);
		});
	}

	return options;
};

})();