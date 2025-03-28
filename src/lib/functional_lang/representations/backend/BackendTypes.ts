import { ParserRuleContext } from 'antlr4ng';

export type NodeType =
	| 'TypeAlias'
	| 'TypeAtomic'
	| 'TypeExpressionType'
	| 'TypeExpressionArrow'
	| 'TypeExpressionGeneric'
	| 'ValueAssignment'
	| 'ValueAtomic'
	| 'ValueExpressionValue'
	| 'ValueExpressionApplication'
	| 'ValueExpressionAbstraction'
	| 'Eval'
	| 'Program';

export type Type =
	| { type: 'TypeAlias'; id: string; expression: TypeExpression }
	| { type: 'TypeAtomic'; id: string; atomic: true };

export type TypeExpression =
	| { type: 'TypeExpressionType'; id: string }
	| {
			type: 'TypeExpressionArrow';
			argumentType: TypeExpression;
			returnType: TypeExpression;
	  }
	| { type: 'TypeExpressionGeneric'; generic_id: number };

export type Value =
	| {
			type: 'ValueAssignment';
			id: string;
			expression: ValueExpression;
			value_type: TypeExpression;
	  }
	| {
			type: 'ValueAtomic';
			id: string;
			atomic: true;
			value_type: TypeExpression;
	  };

export type ValueExpression =
	| { type: 'ValueExpressionValue'; id: string; value_type: TypeExpression }
	| {
			type: 'ValueExpressionApplication';
			function: ValueExpression;
			argument: ValueExpression;
			value_type: TypeExpression;
	  }
	| {
			type: 'ValueExpressionAbstraction';
			argument: string;
			expression: ValueExpression;
			value_type: TypeExpression;
	  };

export type Eval = { type: 'Eval'; expression: ValueExpression; value_type: TypeExpression };

export type Statement = Type | Value | Eval;

export type Program = { type: 'Program'; statements: Statement[] };
