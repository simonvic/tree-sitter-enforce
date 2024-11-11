(commentLine) @comment @spell
(commentBlock) @comment.block @spell

(docLine) @comment.documentation @spell
(docBlock) @comment.documentation.block @spell

(literalBool) @boolean
(literalInt) @number
(literalFloat) @number.float
(literalString) @string
(escapeSequence) @string.escape


; vectors
; TODO: what about arrays of vectors?
(declVariable
  ((typePrimitive) @_type (#eq? @_type "vector"))
  (literalString) @vector
  )

(formalParameter
  ((typePrimitive) @_type (#eq? @_type "vector"))
  default: (literalString) @vector
  )

(identifier) @variable

; ((identifier) @constant
;               (#lua-match? @constant "^[A-Z_][A-Z%d_]+$"))

[
 "+" "-" "*" "/" "%" "^"
 "++" "--"
 "=" "+=" "-=" "*=" "/=" "&=" "^=" "|=" "<<=" ">>="
 "<" "<=" ">=" ">"
 "==" "!="
 "!" "&&" "||" ">>" "<<" "&" "|" "^" "~"
 ] @operator

[
 "(" ")"
 "[" "]"
 "{" "}"
 ] @punctuation.bracket

; TODO: <> in declClass
(typeGeneric [ "<" ">" ] @punctuation.bracket)

[
 "," "." ":" ";"
 ] @punctuation.delimiter

(literalString ["\"" "\""] @punctuation.delimiter)

[
 "continue" "break"
 "switch" "case"
 "typedef"
 "delete"
 "default"
 "extends"
 "new" ; TODO: is it operator?
 "auto" ; TODO: is it type?
 ] @keyword

; ["thread"] @keyword.coroutine

["return"] @keyword.return
["if" "else"] @keyword.conditional
["while" "for" "foreach"] @keyword.repeat
["enum" "class"] @keyword.type
[
 (variableModifier)
 (methodModifier)
 (classModifier)
 (fieldModifier)
 (formalParameterModifier)
 ] @keyword.modifier

["ref"] @type
(declClass typename: (identifier) @type)
(declEnum typename: (identifier) @type)
(typeGeneric (identifier) @type)

(typePrimitive) @type.builtin

[
 (super)
 (this)
 (literalNull)
 ] @variable.builtin

(declMethod
  name: (identifier) @function.method
 )

(invokation
  (identifier) @function.method.call
  )

; Constructor and deconstructor (function with same name of the class)
(declClass
  typename: (identifier) @_typename
  (declMethod
	  name: (identifier) @_name @constructor
	  (#eq? @_name @_typename)
    )
  )

; TODO: mark invalid deconstructor as error?
(declClass
  typename: (identifier) @_typename
  (declDeconstructor
	  "~" @constructor.deconstructor
	  (identifier) @_name @constructor.deconstructor
	  (#eq? @_name @_typename)
    )
  )

; TODO: add a rule for const modifier
; TODO: add named fields

; Constant fields
; (declField
;   ((fieldModifier) @_modifier (#eq? @_modifier "const"))
;   (_)
;   (identifier) @constant
;   )

; TODO: mark assignment to const as error?

; Constant parameters and local variables referencing to it
; (declMethod
;   (formalParameters
;   	(formalParameter
;   	  ((formalParameterModifier) @_modifier (#eq? @_modifier "const"))
;   	  (_)
;   	  (identifier) @_constantParam @constant
;   	  )
;   	)
;   (block
;   	(_
;   	  ((identifier) @constant (#eq? @constant @_constantParam))
;   	  )
;   	)
;   )

; Dead code
(block
  (_)*
  (return)
  (_)* @deadcode (#set! "priority" 110)
  )

(ERROR) @error

; TODO: string and print format injection
