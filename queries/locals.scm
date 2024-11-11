; Scopes
(compilationUnit) @local.scope
(declClass body: (_) @local.scope)
(declEnum body: (_) @local.scope)
(declMethod) @local.scope
(declDeconstructor) @local.scope
(block) @local.scope
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
(typeIdentifier (identifier) @local.reference)
