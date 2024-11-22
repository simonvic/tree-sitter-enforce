; enums

(declEnum
  typename: (identifier) @name
  (#set! "kind" "Enum")
  ) @symbol

(enumMember
  name: (identifier) @name
  (#set! "kind" "EnumMember")
  ) @symbol

; class

(declClass
  typename: (identifier) @name
  (#set! "kind" "Class")
  ) @symbol

(typedef
  alias: (identifier) @name
  (#set! "kind" "Class")
  ) @symbol

; constructor
(declClass
  typename: (identifier) @_typename
  body: (classBody
    (declMethod
	    name: (identifier) @name
	    (#eq? @name @_typename)
	    (#set! "kind" "Constructor")
      ) @symbol
    )
  )

; field

(declField
  ((fieldModifier) @_modifier (#eq? @_modifier "const"))
  type: (_)
  name: (identifier) @name
  (#set! "kind" "Constant")
  ) @symbol

(declField
  type: (_)
  name: (identifier) @name
  (#set! "kind" "Field")
  ) @symbol

; methods
(declMethod
  name: (identifier) @name
  (#set! "kind" "Method")
  ) @symbol
