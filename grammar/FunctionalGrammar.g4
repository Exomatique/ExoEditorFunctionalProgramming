grammar FunctionalGrammar;

TYPE_ID: [A-Z][a-zA-Z_0-9]* ;
VAL_ID: [a-z][a-zA-Z_0-9]* ;


WS: [ \t\n\r\f]+ -> skip ;
COMMENT: '/*' .*? '*/' -> skip;
LINE_COMMENT: '//' ~[\r\n]* -> skip;


type_expression: TYPE_ID # Type
    | '(' type=type_expression ')' # TypeParenthesis
    | <assoc=right> argument_type=type_expression '->' return_type=type_expression # Arrow;

value_expression: VAL_ID #Value
    | '(' expression=value_expression ')' # ValueParenthesis
    | function=value_expression argument=value_expression # Application
    | '{' '(' (args+=VAL_ID)+ ')' '=>' expression=value_expression '}' # Abstraction;

type_statement: 
    'type' type=TYPE_ID '=' expression=type_expression ';' #TypeAlias
    | 'type' type=TYPE_ID ';' #TypeAtomic;

value_statement: 
    'val' val=VAL_ID ':' type=type_expression ';' # ValueAtomic
    | 'val' val=VAL_ID ':' type=type_expression '=' expression=value_expression ';' #ValueAssignment;

eval_statement:
    'eval' expression=value_expression ';';

statement: type_statement 
    | value_statement
    | eval_statement;

program: statement* EOF;