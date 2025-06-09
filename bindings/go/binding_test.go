package tree_sitter_enforce_test

import (
	"testing"

	tree_sitter "github.com/tree-sitter/go-tree-sitter"
	tree_sitter_enforce "github.com/simonvic/tree-sitter-enforce/bindings/go"
)

func TestCanLoadGrammar(t *testing.T) {
	language := tree_sitter.NewLanguage(tree_sitter_enforce.Language())
	if language == nil {
		t.Errorf("Error loading Enforce grammar")
	}
}
