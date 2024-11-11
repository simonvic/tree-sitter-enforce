; Scopes
(compilationUnit) @local.scope
; (declClass (block) @local.scope)
; (declEnum (block) @local.scope)
(declMethod (block) @local.scope)
(declDeconstructor (block) @local.scope)
(if) @local.scope
(for) @local.scope
(foreach) @local.scope
(while) @local.scope

; Definitions
(declClass typename: (identifier) @local.definition.type)
(declEnum typename: (identifier) @local.definition.enum)
(declMethod name: (identifier) @local.definition.method)
(declVariable (_)* (identifier) @local.definition.var)

; References
(identifier) @local.reference
; (typePrimitive) @local.reference
