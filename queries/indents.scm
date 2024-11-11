[
  (block)
  (declClass)
  (declEnum)
  (switch)
  (formalParameters)
  (actualParameters)
] @indent.begin

[
  "(" ")"
  "[" "]"
  "{" "}"
] @indent.branch

[
 ")"
 "]"
 "}"
] @indent.end

(commentLine) @indent.ignore

[
  (ERROR)
  (commentBlock)
] @indent.auto
