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

  INVOKATION: 19,
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
    $.type_primitive,
  ],

  word: $ => $.identifier,

  conflicts: $ => [
    [$.method_modifier, $.class_modifier],
    [$.method_modifier, $.variable_modifier],
    [$.method_modifier, $.field_modifier],
    [$.type_identifier, $._expression],
    [$.type_identifier],
    [$.new],
    [$.type, $._expression],
    [$.statement, $._expression],

    [$.decl_method, $.actual_parameters],

    // TODO: allow blocks as statements (anonymous scope) and allow array_creation only where possible
    [$.block, $.array_creation],
  ],

  extras: $ => [
    /\s/, // whitespaces do matters, but whatever
    $.comment_line,
    $.comment_block,
    $.doc_line,
    $.doc_block,
    $.include,
    $.define,
    $.ifdef,
    $.ifndef,
    $.else,
    $.endif
  ],

  rules: {

    compilation_unit: $ => repeat(choice(
      $.decl_class,
      $.decl_enum,
      $.decl_method,
      $.decl_variable,
      $.typedef,
    )),

    include: $ => seq('#include', $.preproc_const),
    define: $ => seq('#define', $.preproc_const),
    ifdef: $ => seq('#ifdef', $.preproc_const),
    ifndef: $ => seq('#ifndef', $.preproc_const),
    else: _ => token('#else'),
    endif: _ => token('#endif'),

    preproc_const: _ => token.immediate(choice(/\s+[^\n#"]+/, /\s+"[^\n"]*"/)),

    doc_line: _ => token(prec(PREC.DOC, seq(choice('//!', '//?'), /[^\n]*/))),

    doc_block: _ => token(prec(PREC.DOC, seq(
      choice('/**', '/*!'),
      /[^*]*\*+([^/*][^*]*\*+)*/,
      '/',
    ))),

    comment_line: _ => token(prec(PREC.COMMENT, seq('//', /[^\n]*/))),

    // kindly borrowed from https://github.com/tree-sitter/tree-sitter-java/blob/master/grammar.js#L1291C5-L1297C8
    comment_block: _ => token(prec(PREC.COMMENT, seq(
      '/*',
      /[^*]*\*+([^/*][^*]*\*+)*/,
      '/',
    ))),

    block: $ => seq('{', repeat($.statement), '}'),
    statement: $ => choice(
      $.block,
      $.statement_expression,
      $.empty_statement,
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
      $.decl_variable,
      $.assignment,
      $.invokation,
    ),
    statement_expression: $ => seq($._expression, ';'),
    empty_statement: _ => ';',

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
      field("body", $.switch_body),
    ),

    switch_body: $ => seq(
      '{',
      repeat($.switch_case),
      optional(field("default_case", seq('default', ':', repeat($.statement)))),
      '}'
    ),

    switch_case: $ => seq(
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
      optional(field("update", choice(
        $._expression,
        // NOTE: all statements are allowed except for `if` and `typedef`. Eventually filter them out
        $.statement,
        $._assignment
      ))),
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

    _assignment: $ => seq(
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
    ),
    assignment: $ => seq($._assignment, ';'),

    attribute_list: $ => seq(
      '[',
      $._expression,
      repeat(seq(',', $._expression)),
      ']'
    ),

    decl_class: $ => seq(
      optional($.attribute_list),
      repeat($.class_modifier),
      'class',
      field("typename", $.identifier),
      optional(field("type_parameters", $.type_parameters)),
      optional(seq(
        choice(':', 'extends'),
        field("superclass", $.superclass)
      )),
      field("body", $.class_body),
      optional(';'),
    ),

    class_modifier: _ => choice(
      'modded',
      'sealed',
    ),

    type_parameters: $ => seq('<', $.type_parameter, repeat(seq(',', $.type_parameter)), '>'),

    type_parameter: $ => seq(
      field("bound", $.type),
      field("name", $.identifier)
    ),

    superclass: $ => seq(
      field("typename", $.identifier),
      optional(field("types", $.types)),
    ),

    types: $ => seq('<', $.type, repeat(seq(',', $.type)), '>'),

    class_body: $ => seq(
      '{',
      repeat(choice(
        $.decl_enum, // see quirk 6
        $.decl_field,
        $.decl_method,
      )),
      '}',
    ),

    decl_field: $ => seq(
      optional($.attribute_list),
      repeat($.field_modifier),
      field("type", $.type),
      $._var_declarator,
      repeat(seq(',', $._var_declarator)),
      ';'
    ),

    _var_declarator: $ => seq(
      field("name", $.identifier),
      optional(seq('[', optional(field("init_size", $._expression)), ']')),
      optional(seq('=', field("init", $._expression))),
    ),

    field_modifier: _ => choice(
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

    decl_enum: $ => seq(
      optional($.attribute_list),
      repeat($.class_modifier),
      'enum',
      field("typename", $.identifier),
      optional(seq(
        choice(':', 'extends'),
        field("superenum", $.identifier)
      )),
      field("body", $.enum_body),
      optional(';')
    ),

    enum_body: $ => seq(
      '{',
      optional(seq(
        $.enum_member,
        repeat(seq(choice(',', ';'), $.enum_member)),
        optional(choice(',', ';')))),
      '}',
    ),

    enum_member: $ => seq(
      optional($.attribute_list),
      field("name", $.identifier),
      optional(seq('=', field("value", $._expression)))
    ),

    decl_method: $ => seq(
      optional($.attribute_list),
      repeat($.method_modifier),
      field("return_type", $.type),
      optional('~'),
      field("name", $.identifier),
      '(',
      optional($.formal_parameters),
      ')',
      choice(
        seq(
          field("body", $.block),
          optional(';')
        ),
        ';'
      )
    ),

    method_modifier: _ => choice(
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
      'sealed'
    ),

    formal_parameters: $ => seq(
      $.formal_parameter,
      repeat(seq(',', $.formal_parameter)),
      optional(',')
    ),

    formal_parameter: $ => seq(
      repeat($.formal_parameter_modifier),
      field("type", $.type),
      field("name", $.identifier),
      // TODO: use declarator (and array declarator) rule
      repeat(seq('[', optional($._expression), ']')),
      optional(field("default", seq('=', $._expression)))
    ),

    formal_parameter_modifier: _ => choice(
      'owned',
      'const',
      'autoptr',
      'out',
      'inout',
      'notnull',
      'protected', // see quirk 5
      'private',
    ),

    decl_variable: $ => seq(
      repeat($.variable_modifier),
      field("type", choice($.type, 'auto')),
      choice(
        seq(
          $._var_declarator,
          repeat(seq(',', $._var_declarator)),
        ),
        $._function_declarator
      ),
      ';'
    ),

    _function_declarator: $ => seq(
      field("name", $.identifier),
      $.actual_parameters,
    ),

    variable_modifier: _ => choice(
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
      $._expression_parenthesized,
      $.expression_binary,
      $.expression_prefix,
      $.expression_suffix,
      $.cast,
      $.new,
      $.array_creation,
      $.invokation,
      $.key_access,
      $.member_access,
      $.literal,
      // NOTE: types are first class citizens
      $.type_primitive,
      $.type_identifier,
      $.identifier,
      $.super,
      $.this,
    ),

    _expression_parenthesized: $ => seq('(', $._expression, ')'),

    expression_binary: $ => choice(
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

    expression_prefix: $ => prec(PREC.PREFIX, seq(
      choice('++', '--', '+', '-', '!', '~'),
      $._expression,
    )),

    expression_suffix: $ => prec(PREC.POSTFIX, seq(
      $._expression,
      choice('++', '--',)
    )),

    cast: $ => prec(PREC.CAST, seq(
      '(', field("type", $.type), ')', field("value", $._expression)
    )),

    new: $ => seq(
      'new',
      field("type", $.type),
      optional($.actual_parameters),
    ),

    array_creation: $ => seq('{', repeat(seq($._expression, optional(','))), '}'),

    invokation: $ => prec(PREC.INVOKATION, seq(
      optional(seq(field("instance", $._expression), '.')),
      field("invoked", $.identifier),
      $.actual_parameters
    )),

    actual_parameters: $ => seq(
      '(',
      optional(seq(
        $.actual_parameter,
        repeat(seq(',', $.actual_parameter)),
        optional(','),
      )),
      ')'
    ),

    actual_parameter: $ => seq(
      optional(seq(field("name", $.identifier), ':')),
      $._expression
    ),

    key_access: $ => prec(PREC.KEY_ACCESS, seq(
      field("accessed", $._expression),
      '[',
      field("key", $._expression),
      ']',
    )),

    member_access: $ => prec(PREC.DOT, seq(
      field("accessed", $._expression),
      '.',
      field("member", $.identifier),
    )),

    type: $ => choice(
      $.type_primitive,
      $.type_ref,
      $.type_array,
      $.type_identifier,
    ),

    type_primitive: $ => choice(
      $.type_void,
      $.type_bool,
      $.type_int,
      $.type_float,
      $.type_string,
      $.type_typename,
      $.type_vector,
      $.type_func,
    ),

    type_void: _ => 'void',
    type_bool: _ => 'bool',
    type_int: _ => 'int',
    type_float: _ => 'float',
    type_string: _ => 'string',
    type_typename: _ => 'typename',
    type_vector: _ => 'vector',
    type_func: _ => 'func',

    // TODO: request some info on precedence
    // ref Foo[]
    // is it [ref Foo]?
    // is it ref [Foo]?
    // TODO: move ref to modifiers; ref static Foo foo; is allowed
    type_ref: $ => prec(2, seq('ref', $.type)),
    type_array: $ => prec(1, seq($.type, '[', ']')),

    type_identifier: $ => seq(
      $.identifier,
      optional($.types)
    ),

    super: _ => 'super',
    this: _ => 'this',

    literal: $ => choice(
      $.literal_null,
      $.literal_bool,
      $.literal_int,
      $.literal_float,
      $.literal_string,
    ),

    literal_null: _ => token(choice('null', 'NULL')),
    literal_bool: _ => token(choice('false', 'true')),
    literal_int: _ => token(choice(
      seq('0x', /[0-9a-fA-F]+/),
      seq(/[0-9]+/, optional(EXPONENT)),
    )),
    literal_float: _ => token(seq(
      /[0-9]+/,
      '.',
      /[0-9]+/,
      optional(EXPONENT),
    )),
    literal_string: $ => seq(
      '"',
      repeat(choice(
        $.escape_sequence,
        $._string_content,
      )),
      '"',
    ),

    escape_sequence: _ => token(/\\["\\nrt]/),
    _string_content: _ => token(prec(2, choice(
      /[^"\\\n]/,
      /\\[^"\\nrt]/,
    ))),

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
