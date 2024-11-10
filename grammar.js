/**
 * @file Enforce script grammar for treesitter
 * @author simonvic <simonvic.dev@gmail.com>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

const EXPONENT = seq('e', choice('+', '-'), /[0-9]+/);

const PREC = {
  DOC: 1,
  COMMENT: 0,

  INVOKATION: 18,
  DOT: 18,
  POSTFIX: 18,
  PREFIX: 17,
  MULT: 13,
  ADD: 12,
  SHIFT: 11,
  REL: 10,
  EQUAL: 9,
  AND: 8,
  XOR: 7,
  OR: 6,
  LOGICAL_AND: 5,
  LOGICAL_OR: 4,
};

module.exports = grammar({
  name: "enforce",

  supertypes: $ => [
    $.statement,
    $.literal,
    $.type,
  ],

  word: $ => $.identifier,

  conflicts: $ => [
    [$.methodModifier, $.variableModifier],
    [$.methodModifier, $.fieldModifier]
  ],

  extras: $ => [
    /\s/, // whitespaces do matters, but whatever
    $.commentLine,
    $.commentBlock,
    $.docLine,
    $.docBlock,
  ],

  rules: {

    compilationUnit: $ => repeat(choice(
      $.declClass,
      $.declEnum,
      $.declMethod,
      $.declVariable,
      $.typedef,
    )),

    docLine: _ => token(prec(PREC.DOC, seq('//', choice('!', '?'), /[^\n]*/))),

    // kindly borrowed from https://github.com/tree-sitter/tree-sitter-java/blob/master/grammar.js#L1291C5-L1297C8
    docBlock: _ => token(prec(PREC.DOC, seq(
      '/**',
      /[^*]*\*+([^/*][^*]*\*+)*/,
      '/',
    ))),

    commentLine: _ => token(prec(PREC.COMMENT, seq('//', /[^\n]*/))),

    // kindly borrowed from https://github.com/tree-sitter/tree-sitter-java/blob/master/grammar.js#L1291C5-L1297C8
    commentBlock: _ => token(prec(PREC.COMMENT, seq(
      '/*',
      /[^*]*\*+([^/*][^*]*\*+)*/,
      '/',
    ))),

    _statementOrBlock: $ => choice($.statement, $.block),
    block: $ => seq('{', repeat($.statement), '}'),
    statement: $ => choice(
      $.statementExpression,
      $.emptyStatement,
      $.delete,
      $.typedef,
      $.break,
      $.continue,
      $.return,
      $.if,
      $.switch,
      $.while,
      $.for,
      $.foreach,
      $.declVariable,
      $.assignment,
    ),
    statementExpression: $ => seq($._expression, ';'),
    emptyStatement: _ => ';',

    delete: $ => seq('delete', $.identifier, ';'), // TODO: check if other expressions are allowed

    typedef: $ => seq('typedef', $.type, $.identifier),

    break: _ => seq('break', ';'),
    continue: _ => seq('continue', ';'),

    return: $ => seq('return', optional($._expression), ';'),

    if: $ => prec.right(seq(
      'if', '(', $._expression, ')', $._statementOrBlock,
      optional(seq('else', $._statementOrBlock))
    )),

    switch: $ => seq(
      'switch', '(', field("subject", $._expression), ')', '{',
      repeat(seq('case', field("label", $._expression), ':', repeat($.statement))),
      optional(field("default", seq('default', ':', repeat($.statement)))),
      '}'
    ),

    while: $ => seq('while', '(', $._expression, ')', $._statementOrBlock),

    for: $ => seq(
      'for',
      '(',
      field("init", $.statement),
      field("condition", $._expression), // NOTE: not optional in enforce
      ';',
      field("update", optional($._expression)),
      ')',
      $._statementOrBlock
    ),

    foreach: $ => seq(
      'foreach',
      '(',
      field("key", $.iterator),
      optional(seq(',', field("value", $.iterator))),
      ':',
      field("iterated", $._expression),
      ')',
      $._statementOrBlock
    ),

    iterator: $ => seq(
      choice($.type, 'auto'),
      $.identifier
    ),

    assignment: $ => seq(
      $.identifier,
      choice(
        '=',
        '+=',
        '-=',
        '*=',
        '/=',
        '&=',
        '^=',
        '|=',
        '<<=',
        '>>=',
      ),
      $._expression,
      ';'
    ),

    declClass: $ => seq(
      repeat($.classModifier),
      'class', field("typename", $.identifier),
      // TODO: generics
      optional(seq(choice(':', 'extends'), field("superTypename", $.identifier))),
      // TODO: generics
      '{',
      repeat(choice(
        $.declEnum, // see quirk 6
        $.declField,
        $.declDeconstructor,
        $.declMethod,
      )),
      '}',
    ),

    classModifier: _ => 'modded',

    declField: $ => seq(
      repeat($.fieldModifier),
      $.type,
      $.identifier,
      optional(seq('=', $._expression)),
      ';'
    ),

    fieldModifier: _ => choice(
      'const',
      'static',
      'autoptr',
      'proto',
      'protected',
      'private',
    ),

    declDeconstructor: $ => seq(
      'void', '~', $.identifier, '(', optional($.formalParameters), ')', $.block
    ),

    declEnum: $ => seq(
      'enum', field("typename", $.identifier),
      optional(seq(choice(':', 'extends'), field("superTypename", $.identifier))),
      '{',
      optional(seq(
        $.enumMember,
        repeat(seq(',', $.enumMember)),
        optional(',')
      )),
      '}',
    ),

    enumMember: $ => seq($.identifier, optional(seq('=', $._expression))),

    declMethod: $ => seq(
      repeat($.methodModifier),
      field("returnType", $.type),
      $.identifier,
      '(',
      optional($.formalParameters),
      ')',
      choice(
        $.block,
        ';'
      )
    ),

    methodModifier: _ => choice(
      'override',
      'proto',
      'native',
      'static',
      'protected',
      'private',
    ),

    formalParameters: $ => seq(
      $.formalParameter,
      repeat(seq(',', $.formalParameter)),
      optional(',')
    ),

    formalParameter: $ => seq(
      repeat($.formalParameterModifier),
      $.type,
      $.identifier,
      optional(field("default", seq('=', $._expression)))
    ),

    formalParameterModifier: _ => choice(
      'const',
      'autoptr',
      'out',
      'inout',
      'notnull',
      'protected', // see quirk 5
      'private',
    ),

    declVariable: $ => seq(
      repeat($.variableModifier),
      choice($.type, 'auto'),
      $.identifier,
      optional(seq('=', $._expression)),
      ';'
    ),

    variableModifier: _ => choice(
      'const',
      'static',
      'autoptr',
      'protected',
      'private',
    ),

    _expression: $ => choice(
      $._expressionParenthesized,
      $.expressionBinary,
      $.expressionPrefix,
      $.expressionSuffix,
      $.new,
      $.invokation,
      $.memberAccess,
      $.literal,
      $.typePrimitive, // NOTE: types are first class citizens
      $.identifier,
      $.super,
      $.this,
    ),

    _expressionParenthesized: $ => seq('(', $._expression, ')'),

    expressionBinary: $ => choice(
      ...[
        ['&&', PREC.LOGICAL_AND],
        ['||', PREC.LOGICAL_OR],
        ['>>', PREC.SHIFT],
        ['<<', PREC.SHIFT],
        ['&', PREC.AND],
        ['^', PREC.XOR],
        ['|', PREC.OR],
        ['+', PREC.ADD],
        ['-', PREC.ADD],
        ['*', PREC.MULT],
        ['/', PREC.MULT],
        ['%', PREC.MULT],
        ['<', PREC.REL],
        ['<=', PREC.REL],
        ['==', PREC.EQUAL],
        ['!=', PREC.EQUAL],
        ['>=', PREC.REL],
        ['>', PREC.REL],
      ].map(([operator, precedence]) =>
        prec.left(precedence, seq(
          field("lhs", $._expression),
          // @ts-ignore
          field("bop", operator),
          field("rhs", $._expression),
        )),
      ),
    ),

    expressionPrefix: $ => prec(PREC.PREFIX, seq(
      choice('++', '--', '+', '-', '!', '~'),
      $._expression,
    )),

    expressionSuffix: $ => prec(PREC.POSTFIX, seq(
      $._expression,
      choice('++', '--',)
    )),

    new: $ => seq('new', $.identifier, '(', optional($.actualParameters), ')'),

    invokation: $ => prec(PREC.INVOKATION, seq(
      $._expression, '(', optional($.actualParameters), ')'
    )),

    actualParameters: $ => seq(
      $.actualParameter,
      repeat(seq(',', $.actualParameter)),
      optional(','),
    ),

    actualParameter: $ => $._expression,

    memberAccess: $ => prec(PREC.DOT, seq(
      field("accessed", $._expression),
      '.',
      field("member", $.identifier),
    )),

    type: $ => choice(
      $.typePrimitive,
      $.typeRef,
      $.typeArray,
      $.identifier,
    ),

    typePrimitive: _ => choice(
      'void',
      'bool',
      'int',
      'float',
      'string',
      'typename',
      'vector',
    ),

    // TODO: request some info on precedence
    // ref Foo[]
    // is it [ref Foo]?
    // is it ref [Foo]?
    typeRef: $ => prec(1, seq('ref', $.type)),
    typeArray: $ => seq($.type, '[', ']'),

    super: _ => 'super',
    this: _ => 'this',

    literal: $ => choice(
      $.literalNull,
      $.literalBool,
      $.literalInt,
      $.literalFloat,
      $.literalString,
    ),

    literalNull: _ => token(choice('null', 'NULL')),
    literalBool: _ => token(choice('false', 'true')),
    literalInt: _ => token(choice(
      seq('0x', /[0-9A-F]+/),
      seq(/[0-9]+/, optional(EXPONENT)),
    )),
    literalFloat: _ => token(seq(
      /[0-9]+/,
      '.',
      /[0-9]+/,
      optional(EXPONENT),
    )),
    literalString: $ => seq(
      '"',
      repeat(choice(
        $.escapeSequence,
        $._stringContent,
      )),
      '"',
    ),

    escapeSequence: _ => token(/\\["\\nrt]/),
    _stringContent: _ => token(choice(
      /[^"\\\n]/,
      /\\[^"\\nrt]/,
    )),

    identifier: _ => token(/[a-zA-Z_][a-zA-Z0-9_]*/),

  }
});

// Quirks
/*
 * 1. classes can be named with just a number, a string, underscore...
 *
 * 2. Whitespaces are not ignored
 *  - function split is not possible
 *  - these are two statements
 *    ```
 *    return // empty return
 *    69; // statement expression
 *    ```
 * 3. Given the 2., array and enum entries can be on different lines without
 * being separated by a comma
 *
 * 4. Instantiation can be done without parameters `new SomeType;`
 *
 * 5. Visibility modifiers are allowed (but unused?) for formal parameters
 *
 * 6. enum can be nested in classes, but not be used?
 *
 */
