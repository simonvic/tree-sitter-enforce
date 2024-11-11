([
  (commentBlock)
  (commentLine)
  ] @injection.content
 (#set! injection.language "comment"))

([
  (docBlock)
  (docLine)
  ] @injection.content
 (#set! injection.language "doxygen"))

; TODO: can't use printf language, we need numbered format
; (invokation
;   (memberAccess
;     accessed: ((typePrimitive) @_accessed (#eq? @_accessed "string"))
;   	member: (identifier) @_method
;   	)
;   (actualParameters
;   	(actualParameter
;   	  (literalString) @injection.content
;   	  )
;   	(actualParameter)*
;   	)
;   (#eq? @_method "Format")
;   (#set! injection.language "printf")
;   )
