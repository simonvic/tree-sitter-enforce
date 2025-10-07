# tree-sitter-enforce

[![CI][ci]](https://github.com/simonvic/tree-sitter-enforce/actions/workflows/publish.yml)

Enforce grammar for [tree-sitter](https://github.com/tree-sitter/tree-sitter).

This grammar intends to be a close approximation of the
[Enforce](https://community.bistudio.com/wiki/DayZ:Enforce_Script_Syntax)
script "specification".

> [!NOTE]
> We don't have official specification; some opinionated choices may have been
> taken (e.g. mandatory semicolon terminated statements)
> 
> Read more about it
> [here](https://github.com/simonvic/tree-sitter-enforce/issues/7)

## Getting started

### neovim

Neovim doesn't recognize the Enforce filetype, and since it uses `.c` file
extension, you need to add a custom language filetype; add the following
somewhere in your `init.lua`

```lua
vim.filetype.add({
	pattern = {
		[".*/scripts/.*/.*%.c"] = "enforce",
	},
})
```

*The pattern will match all `.c` files in a `scripts/some_module/` directory.
You may have to modify the pattern to suit your needs.*

To install the parser, you can use
[nvim-treesitter](https://github.com/nvim-treesitter/nvim-treesitter) plugin
and run `:TSInstall enforce`

### VSCode

> [!NOTE]
> This has not been tested. Use at your own discretion

You can use `tree-sitter-vscode` plugin.
You'll likely need `tree-sitter-enforce.wasm`, which you can find in the
[releases](https://github.com/simonvic/tree-sitter-enforce/releases)
or you can clone this repository and build it with tree-sitter

[ci]: https://img.shields.io/github/actions/workflow/status/simonvic/tree-sitter-enforce/publish.yml?logo=github&label=CI
