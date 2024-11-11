(declMethod
  name: (identifier) @name @start
  (#set! "kind" "Method")) @symbol

(declDeconstructor
  (identifier) @name
  (#set! "kind" "Constructor")) @symbol

(declClass
  typename: (identifier) @name
  (#set! "kind" "Class")) @symbol

(declEnum
  typename: (identifier) @name
  (#set! "kind" "Enum")) @symbol

(declField
  (identifier) @name
  (#set! "kind" "Field")) @symbol

