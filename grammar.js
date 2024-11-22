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
    $.typePrimitive,
    $.attributeParameter,
  ],

  word: $ => $.identifier,

  conflicts: $ => [
    [$.methodModifier, $.variableModifier],
    [$.methodModifier, $.fieldModifier],
    [$.typeIdentifier, $._expression],
    [$.typeIdentifier],
    [$.new],
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
    $.include,
    $.define,
    $.ifdef,
    $.ifndef,
    $.else,
    $.endif
  ],

  rules: {

    compilationUnit: $ => repeat(choice(
      $.declClass,
      $.declEnum,
      $.declMethod,
      $.declVariable,
      $.typedef,
    )),

    include: $ => seq('#include', $.preprocConst),
    define: $ => seq('#define', $.preprocConst),
    ifdef: $ => seq('#ifdef', $.preprocConst),
    ifndef: $ => seq('#ifndef', $.preprocConst),
    else: _ => token('#else'),
    endif: _ => token('#endif'),

    preprocConst: _ => token.immediate(choice(/\s+[^\n#"]+/, /\s+"[^\n"]*"/)),

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

    block: $ => seq('{', repeat($.statement), '}'),
    statement: $ => choice(
      $.block,
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

    delete: $ => seq('delete', $._expression, ';'),

    typedef: $ => seq(
      'typedef',
      field("type", $.type),
      field("alias", $.identifier),
      ';'
    ),

    break: _ => seq('break', ';'),
    continue: _ => seq('continue', ';'),

    return: $ => seq('return', optional($._expression), ';'),

    if: $ => prec.right(seq(
      'if', '(', $._expression, ')', $.statement,
      optional(seq('else', $.statement))
    )),

    switch: $ => seq(
      'switch',
      '(',
      field("subject", $._expression),
      ')',
      field("body", $.switchBody),
    ),

    switchBody: $ => seq(
      '{',
      repeat($.switchCase),
      optional(field("defaultCase", seq('default', ':', repeat($.statement)))),
      '}'
    ),

    switchCase: $ => seq(
      'case',
      field("label", $._expression),
      ':',
      repeat($.statement),
      // NOTE: fallthrough cases can't have statements, but we don't care
    ),

    while: $ => seq(
      'while',
      '(',
      field("condition", $._expression),
      ')',
      field("body", $.statement),
    ),

    for: $ => seq(
      'for',
      '(',
      field("init", $.statement),
      field("condition", $._expression), // NOTE: not optional in enforce
      ';',
      field("update", optional($._expression)),
      ')',
      field("body", $.statement),
    ),

    foreach: $ => seq(
      'foreach',
      '(',
      field("key", $.iterator),
      optional(seq(',', field("value", $.iterator))),
      ':',
      field("iterated", $._expression),
      ')',
      field("body", $.statement),
    ),

    iterator: $ => seq(
      choice($.type, 'auto'),
      $.identifier
    ),

    assignment: $ => seq(
      field("lhs", $._expression),
      field("bop", choice(
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
      )),
      field("rhs", $._expression),
      ';'
    ),

    attributeList: $ => seq(
      '[',
      $.attribute, // see quirk 8
      repeat(seq(',', $.attribute)),
      ']'
    ),

    attribute: $ => seq(
      field("name", $.identifier),
      $.attributeParameters,
    ),

    attributeParameters: $ => seq(
      '(',
      optional(seq(
        $.attributeParameter,
        repeat(seq(',', $.attributeParameter)),
      )),
      ')'
    ),

    attributeParameter: $ => choice(
      // TODO: ask about specs, probably some other expression is allowed
      $.attribute,
      $.literalInt,
      $.literalBool,
      $.literalString,
      $.attributeParameterArray,
    ),

    attributeParameterArray: $ => seq(
      '{',
      optional(seq(
        $.attributeParameter,
        repeat(seq(',', $.attributeParameter)),
      )),
      '}'
    ),

    declClass: $ => seq(
      optional($.attributeList),
      repeat($.classModifier),
      'class',
      field("typename", $.identifier),
      optional(field("typeParameters", $.typeParameters)),
      optional(seq(
        choice(':', 'extends'),
        field("superclass", $.superclass)
      )),
      field("body", $.classBody),
      optional(';'),
    ),

    classModifier: _ => 'modded',

    typeParameters: $ => seq('<', $.typeParameter, repeat(seq(',', $.typeParameter)), '>'),

    typeParameter: $ => seq(
      field("bound", $.type),
      field("name", $.identifier)
    ),

    superclass: $ => seq(
      field("typename", $.identifier),
      optional(field("types", $.types)),
    ),

    types: $ => seq('<', $.type, repeat(seq(',', $.type)), '>'),

    classBody: $ => seq(
      '{',
      repeat(choice(
        $.declEnum, // see quirk 6
        $.declField,
        $.declMethod,
      )),
      '}',
    ),

    declField: $ => seq(
      optional($.attributeList),
      repeat($.fieldModifier),
      field("type", $.type),
      $._varDeclarator,
      repeat(seq(',', $._varDeclarator)),
      ';'
    ),

    _varDeclarator: $ => seq(
      field("name", $.identifier),
      optional(seq('[', optional(field("initSize", $._expression)), ']')),
      optional(seq('=', field("init", $._expression))),
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

    declEnum: $ => seq(
      optional($.attributeList),
      'enum',
      field("typename", $.identifier),
      optional(seq(
        choice(':', 'extends'),
        field("superenum", $.identifier)
      )),
      field("body", $.enumBody),
      optional(';')
    ),

    enumBody: $ => seq(
      '{',
      optional(seq(
        $.enumMember,
        repeat(seq(choice(',', ';'), $.enumMember)),
        optional(choice(',', ';')))),
      '}',
    ),

    enumMember: $ => seq(
      optional($.attributeList),
      field("name", $.identifier),
      field("value", optional(seq('=', $._expression)))
    ),

    declMethod: $ => seq(
      optional($.attributeList),
      repeat($.methodModifier),
      field("returnType", $.type),
      optional('~'),
      field("name", $.identifier),
      '(',
      optional($.formalParameters),
      ')',
      choice(
        seq(
          field("body", $.block),
          optional(';')
        ),
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
      field("type", $.type),
      field("name", $.identifier),
      optional(seq('[', optional($._expression), ']')),
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
      field("type", choice($.type, 'auto')),
      $._varDeclarator,
      repeat(seq(',', $._varDeclarator)),
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
      // NOTE: types are first class citizens
      $.typePrimitive,
      $.typeIdentifier,
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

    new: $ => seq(
      'new',
      field("type", $.type),
      optional($.actualParameters),
    ),

    arrayCreation: $ => seq('{', repeat(seq($._expression, optional(','))), '}'),

    invokation: $ => prec(PREC.INVOKATION, seq(
      $._expression, $.actualParameters
    )),

    actualParameters: $ => seq(
      '(',
      optional(seq(
        $.actualParameter,
        repeat(seq(',', $.actualParameter)),
        optional(','),
      )),
      ')'
    ),

    actualParameter: $ => $._expression,

    keyAccess: $ => prec(PREC.KEY_ACCESS, seq(
      field("accessed", $._expression),
      '[',
      field("key", $._expression),
      ']',
    )),

    // TODO: foo.bar() should be identifier.invocation
    memberAccess: $ => prec(PREC.DOT, seq(
      field("accessed", $._expression),
      '.',
      field("member", $.identifier),
    )),

    type: $ => choice(
      $.typePrimitive,
      $.typeRef,
      $.typeArray,
      $.typeIdentifier,
    ),

    typePrimitive: $ => choice(
      $.typeVoid,
      $.typeBool,
      $.typeInt,
      $.typeFloat,
      $.typeString,
      $.typeTypename,
      $.typeVector,
      $.typeFunc,
    ),

    typeVoid: _ => 'void',
    typeBool: _ => 'bool',
    typeInt: _ => 'int',
    typeFloat: _ => 'float',
    typeString: _ => 'string',
    typeTypename: _ => 'typename',
    typeVector: _ => 'vector',
    typeFunc: _ => 'func',

    // TODO: request some info on precedence
    // ref Foo[]
    // is it [ref Foo]?
    // is it ref [Foo]?
    typeRef: $ => prec(2, seq('ref', $.type)),
    typeArray: $ => prec(1, seq($.type, '[', ']')),

    typeIdentifier: $ => seq(
      $.identifier,
      optional($.types)
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
 * 8. Attributes can be empty
 *
 */
