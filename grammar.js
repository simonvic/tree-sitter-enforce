/**
 * @file Enforce script grammar for treesitter
 * @author simonvic <simonvic.dev@gmail.com>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

const EXPONENT = seq('e', choice('+', '-'), /[0-9]+/);

const PREC = {
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

  conflicts: $ => [
  ],

  rules: {
    compilationUnit: $ => repeat(choice(
      $.declClass,
      $.declEnum,
      $.declMethod,
      $.declVariable,
      $.typedef,
    )),

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
      'class', field("typename", $.identifier),
      // TODO: generics
      optional(seq(choice(':', 'extends'), field("superTypename", $.identifier))),
      // TODO: generics
      '{',
      repeat(choice(
        // $.declConstructor,
        // $.declDeconstructor,
        $.declMethod,
        //$.declField,
      )),
      '}',
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
      seq('(', repeat($.formalParameter), ')'),
      choice(
        $.block,
        ';'
      )
    ),

    methodModifier: _ => token(choice(
      'modded',
      'override',
      'proto',
      'native',
      'static',
      'protected',
      'private',
    )),

    formalParameter: $ => seq(
      $.formalParameterModifier,
      $.type,
      $.identifier,
      optional(seq('=', $._expression))
    ),

    formalParameterModifier: $ => token(choice(
      'const',
      'autoptr',
      'out',
      'inout',
      'protected', // see quirk 5
      'private',
    )),

    declVariable: $ => seq(
      repeat($.variableModifier),
      choice($.type, 'auto'),
      $.identifier,
      optional(seq('=', $._expression)),
      ';'
    ),

    variableModifier: _ => token(choice(
      'const',
      'static',
      'autoptr',
      'proto',
      'protected',
      'private',
    )),

    _expression: $ => choice(
      $._expressionParenthesized,
      $.expressionBinary,
      $.expressionPrefix,
      $.expressionSuffix,
      $.literal,
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

    type: $ => choice(
      $.typePrimitive,
      $.typeRef,
      $.typeArray
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

    typeRef: $ => seq('ref', $.identifier),
    typeArray: $ => seq($.type, '[', ']'),

    super: _ => 'super',
    this: _ => 'this',

    identifier: _ => seq(/[a-zA-Z_]/, repeat(/[a-zA-Z0-9_]/)),

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
 *
 */
