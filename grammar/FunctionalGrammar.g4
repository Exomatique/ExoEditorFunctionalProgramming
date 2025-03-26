grammar FunctionalGrammar;

TYPE_ID: [A-Z][a-zA-Z_0-9]* ;
VAL_ID: [a-z][a-zA-Z_0-9]* ;


WS: [ \t\n\r\f]+ -> skip ;


type_expression: TYPE_ID
    | '(' type_expression ')'
    | type_expression '->' type_expression;

value_expression: VAL_ID
    | '(' value_expression ')'
    | value_expression value_expression
    | '(' '(' (args+=VAL_ID)+ ')' '=>' value_expression ')';

type_statement: 
    'type' type_name=TYPE_ID ('=' expression=type_expression)? ';';

val_statement: 
    'val' var_name=VAL_ID ':' type_expression ('=' expression=value_expression)? ';';


statement: type_statement 
    | val_statement;

program: statement+;