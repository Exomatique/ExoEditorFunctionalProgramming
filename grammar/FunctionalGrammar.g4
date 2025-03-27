grammar FunctionalGrammar;

TYPE_ID: [A-Z][a-zA-Z_0-9]* ;
VAL_ID: [a-z][a-zA-Z_0-9]* ;


WS: [ \t\n\r\f]+ -> skip ;
COMMENT: '/*' .*? '*/' -> skip;
LINE_COMMENT: '//' ~[\r\n]* -> skip;


type_expression: TYPE_ID
    | '(' type_expression ')'
    | argument_type=type_expression '->' return_type=type_expression;

value_expression: VAL_ID
    | '(' expression=value_expression ')'
    | func=value_expression argument=value_expression
    | '{' '(' (args+=VAL_ID)+ ')' '=>' expression=value_expression '}';

type_statement: 
    'type' type_name=TYPE_ID ('=' expression=type_expression)? ';';

value_statement: 
    'val' var_name=VAL_ID ':' type_expression ('=' expression=value_expression)? ';';

eval_statement:
    'eval' expression=value_expression ';';

statement: type_statement 
    | value_statement
    | eval_statement;

program: statement* EOF;