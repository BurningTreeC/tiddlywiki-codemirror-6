# tiddlywiki-codemirror-6

This is a plugin for [TiddlyWiki 5](https://tiddlywiki.com)

The plugin adds the [CodeMirror 6](https://codemirror.net) editor to TiddlyWiki

## Contributing

Everyone is welcome to create an Issue or a Pull request

## Documentation

Documentation can be found at https://codemirror.net/docs/

The [CodeMirror Discuss Forum](https://discuss.codemirror.net) is a great place to find answers

## Installation

You can install the plugin in two ways

### Drag and Drop

- Go to the [plugin page](https://burningtreec.github.io/tiddlywiki-codemirror-6)
- Drag the plugin to your [Tiddlywiki](https://tiddlywiki.com)

### NodeJs

- clone this repository to your `$TIDDLYWIKI_PLUGIN_PATH`

```
git clone --depth=1 git@github.com:BurningTreeC/tiddlywiki-codemirror-6.git $TIDDLYWIKI_PLUGIN_PATH
```

- enable the plugin in your `tiddlywiki.info` file

```
"plugins": [
	"plugins/first-plugin",
	"plugins/second-plugin",
	"tiddlywiki-codemirror-6/tiddlywiki-codemirror-6"
	]
```
