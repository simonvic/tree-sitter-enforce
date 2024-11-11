(declClass) @class.outer

(declMethod) @function.outer

(declMethod
  (block) @function.inner)
@function.outer


(for
  (block) @loop.inner) @loop.outer

(while
  (block) @loop.inner) @loop.outer

; blocks
(block) @block.outer

(invokation) @call.outer

(formalParameters
  "," @_start
  .
  (formalParameter) @parameter.inner
  (#make-range! "parameter.outer" @_start @parameter.inner))

(formalParameters
  .
  (formalParameter) @parameter.inner
  .
  ","? @_end
  (#make-range! "parameter.outer" @parameter.inner @_end))

(actualParameters
  "," @_start
  .
  (actualParameter) @parameter.inner
  (#make-range! "parameter.outer" @_start @parameter.inner))

(actualParameters
  .
  (actualParameter) @parameter.inner
  .
  ","? @_end
  (#make-range! "parameter.outer" @parameter.inner @_end))

[
  (commentLine)
  (commentBlock)
  (docLine)
  (docBlock)
] @comment.outer

[
  (literalInt)
  (literalFloat)
] @number.inner
