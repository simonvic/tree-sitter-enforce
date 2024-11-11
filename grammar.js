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
  KEY_ACCESS: 18,
  POSTFIX: 18,
  CAST: 17,
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
    [$.methodModifier, $.fieldModifier],
    [$.typeGeneric, $._expression],
    [$.type, $._expression],

    // TODO: allow blocks as statements (anonymous scope) and allow arrayCreation only where possible
    [$.block, $.arrayCreation],
  ],

  extras: $ => [
    /\s/, // whitespaces do matters, but whatever
    $.commentLine,
    $.commentBlock,
    $.docLine,
    $.docBlock,
    // $.preprocDirective,
  ],

  rules: {

    compilationUnit: $ => repeat(choice(
      $.declClass,
      $.declEnum,
      $.declMethod,
      $._declVariable,
      $.typedef,
    )),

    // preprocDirective: $ => choice(
    //   $.include,
    //   $.define,
    //   $.ifdef,
    //   $.ifndef,
    //   $.else,
    //   $.endif
    // ),
    //
    // // TODO: sort out why treesitter segfaults
    // include: _ => /#include\s+([^\n#"]+|("[^\n"]*"))/,
    // define: _ => /#define\s+([^\n#"]+|("[^\n"]*"))/,
    // ifdef: _ => /#ifdef\s+([^\n#"]+|("[^\n"]*"))/,
    // ifndef: _ => /#ifndef\s+([^\n#"]+|("[^\n"]*"))/,
    // else: _ => /#else/,
    // endif: _ => /#endif/,

    docLine: _ => token(prec(PREC.DOC, seq(choice('//!', '//?'), /[^\n]*/))),

    // kindly borrowed from https://github.com/tree-sitter/tree-sitter-java/blob/master/grammar.js#L1291C5-L1297C8
    docBlock: _ => token(prec(PREC.DOC, seq(
      choice('/**', '/*!'),
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
      $._declVariable,
      $.assignment,
    ),
    statementExpression: $ => seq($._expression, ';'),
    emptyStatement: _ => ';',

    delete: $ => seq('delete', $.identifier, ';'), // TODO: check if other expressions are allowed

    typedef: $ => seq('typedef', $.type, $.identifier, ';'),

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
      $._expression,
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
      optional(seq('<', $.type, $.identifier, repeat(seq(',', $.type, $.identifier)), '>')),
      optional(seq(
        choice(':', 'extends'),
        field("superTypename", $.identifier),
        optional(seq('<', $.type, repeat(seq(',', $.type)), '>')),
      )),
      '{',
      repeat(choice(
        $.declEnum, // see quirk 6
        $._declField,
        $.declDeconstructor,
        $.declMethod,
      )),
      '}',
      optional(';')
    ),

    classModifier: _ => 'modded',

    _declField: $ => choice(
      $.declField,
      $.declFieldArray,
    ),

    // TODO: complete rewrite declField and declVariable

    declField: $ => seq(
      repeat($.fieldModifier),
      $.type,
      $.identifier,
      optional(seq('=', $._expression)),
      repeat(seq(',', $.identifier, optional(seq('=', $._expression)))),
      ';'
    ),

    declFieldArray: $ => seq(
      repeat($.fieldModifier),
      $.type,
      $.identifier,
      '[', optional(field("initSize", $._expression)), ']',
      optional(seq('=', $._expression)),
      repeat(seq(
        ',',
        $.identifier,
        optional(seq('[', optional(field("initSize", $._expression)), ']')),
        optional(seq('=', $._expression))
      )),
      ';'
    ),

    fieldModifier: _ => choice(
      'const',
      'static',
      'autoptr',
      'proto',
      'protected',
      'private',
      'reference',

      // TODO: ignored?
      'owned',
    ),

    declDeconstructor: $ => seq(
      // TODO: add methodModifier
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
      optional(';')
    ),

    enumMember: $ => seq($.identifier, optional(seq('=', $._expression))),

    declMethod: $ => seq(
      repeat($.methodModifier),
      field("returnType", $.type),
      field("name", $.identifier),
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
      'external',
      'volatile',
      'owned',
      'event',
      'protected',
      'private',
    ),

    // TODO: add array
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

    _declVariable: $ => choice(
      $.declVariable,
      $.declVariableArray,
    ),

    declVariable: $ => seq(
      repeat($.variableModifier),
      choice($.type, 'auto'),
      $.identifier, optional(seq('=', $._expression)),
      repeat(seq(',', $.identifier, optional(seq('=', $._expression)))),
      ';'
    ),

    declVariableArray: $ => seq(
      repeat($.variableModifier),
      $.type,
      $.identifier,
      '[', optional(field("initSize", $._expression)), ']',
      optional(seq('=', $._expression)),
      repeat(seq(
        ',',
        $.identifier,
        optional(seq('[', optional(field("initSize", $._expression)), ']')),
        optional(seq('=', $._expression))
      )),
      ';'
    ),

    variableModifier: _ => choice(
      'const',
      'static',
      'autoptr',
      'protected',
      'private',

      // TODO: ignored?
      'owned',
      'reference',
    ),

    _expression: $ => choice(
      $._expressionParenthesized,
      $.expressionBinary,
      $.expressionPrefix,
      $.expressionSuffix,
      $.cast,
      $.new,
      $.arrayCreation,
      $.invokation,
      $.keyAccess,
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

    cast: $ => prec(PREC.CAST, seq(
      '(', field("type", $.type), ')', field("value", $._expression)
    )),

    new: $ => seq('new', $.type, '(', optional($.actualParameters), ')'),

    arrayCreation: $ => seq('{', repeat(seq($._expression, optional(','))), '}'),

    invokation: $ => prec(PREC.INVOKATION, seq(
      $._expression, '(', optional($.actualParameters), ')'
    )),

    actualParameters: $ => seq(
      $.actualParameter,
      repeat(seq(',', $.actualParameter)),
      optional(','),
    ),

    actualParameter: $ => $._expression,

    keyAccess: $ => prec(PREC.KEY_ACCESS, seq(
      field("accessed", $._expression),
      '[',
      field("key", $._expression),
      ']',
    )),

    memberAccess: $ => prec(PREC.DOT, seq(
      field("accessed", $._expression),
      '.',
      field("member", $.identifier),
    )),

    type: $ => choice(
      $.typePrimitive,
      $.typeRef,
      $.typeArray,
      $.typeGeneric,
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
      'func',
    ),

    // TODO: request some info on precedence
    // ref Foo[]
    // is it [ref Foo]?
    // is it ref [Foo]?
    typeRef: $ => prec(1, seq('ref', $.type)),
    typeArray: $ => seq($.type, '[', ']'),

    typeGeneric: $ => seq(
      $.identifier, '<', $.type, repeat(seq(',', $.type)), '>'
    ),

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
      seq('0x', /[0-9a-fA-F]+/),
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
 * 7. generic types can be upper bounded by native only types, but no visible
 * difference is noticed
 *
 * 7.1. generic type with primitive upper bound, cannot be instantiated without
 * a "wrong number of template parameters" compile error
 *
 */
