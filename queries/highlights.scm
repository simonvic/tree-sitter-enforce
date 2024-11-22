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
  (typeVector)
  (literalString) @vector
  )

(formalParameter
  type: (typeVector)
  default: (literalString) @vector
  )

(identifier) @variable

((identifier) @constant (#lua-match? @constant "^[A-Z_][A-Z%d_]+$"))

; Preprocessor directives
[
 (include)
 (define)
 (ifdef)
 (ifndef)
 (else)
 (endif)
 ] @keyword.directive

(preprocConst) @constant.macro

; Attributes
(attribute name: (_) @attribute)

; Constant fields
(declField
  ((fieldModifier) @_modifier (#eq? @_modifier "const"))
  type: (_)
  name: (identifier) @constant
  )

(enumMember name: (identifier) @constant)

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
(types [ "<" ">" ] @punctuation.bracket)

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
(typeIdentifier (identifier) @type)

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
  body: (classBody
    (declMethod
	    name: (identifier) @_name @constructor
	    (#eq? @_name @_typename)
      )
    )
  )

; TODO: mark invalid deconstructor as error?
(declClass
  typename: (identifier) @_typename
  body: (classBody
    (declDeconstructor
	    "~" @constructor.deconstructor
	    (identifier) @_name @constructor.deconstructor
	    (#eq? @_name @_typename)
      )
    )
  )

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
;   	  name: (identifier) @_constantParam @constant
;   	  )
;   	)
;   body: (block
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
