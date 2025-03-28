import { ParserRuleContext } from 'antlr4ng';

export type NodeType =
	| 'TypeAlias'
	| 'TypeAtomic'
	| 'TypeExpressionType'
	| 'TypeExpressionArrow'
	| 'ValueAssignment'
	| 'ValueAtomic'
	| 'ValueExpressionValue'
	| 'ValueExpressionApplication'
	| 'ValueExpressionAbstraction'
	| 'Eval'
	| 'Program';

export type Type =
	| { type: 'TypeAlias'; id: string; expression: TypeExpression; ctx: ParserRuleContext }
	| { type: 'TypeAtomic'; id: string; atomic: true; ctx: ParserRuleContext };

export type TypeExpression =
	| { type: 'TypeExpressionType'; id: string; ctx: ParserRuleContext }
	| {
			type: 'TypeExpressionArrow';
			argumentType: TypeExpression;
			returnType: TypeExpression;
			ctx: ParserRuleContext;
	  };

export type Value =
	| {
			type: 'ValueAssignment';
			id: string;
			expression: ValueExpression;
			value_type: TypeExpression;
			ctx: ParserRuleContext;
	  }
	| {
			type: 'ValueAtomic';
			id: string;
			atomic: true;
			value_type: TypeExpression;
			ctx: ParserRuleContext;
	  };

export type ValueExpression =
	| { type: 'ValueExpressionValue'; id: string; ctx: ParserRuleContext }
	| {
			type: 'ValueExpressionApplication';
			function: ValueExpression;
			argument: ValueExpression;
			ctx: ParserRuleContext;
	  }
	| {
			type: 'ValueExpressionAbstraction';
			arguments: string[];
			expression: ValueExpression;
			ctx: ParserRuleContext;
	  };

export type Eval = { type: 'Eval'; expression: ValueExpression; ctx: ParserRuleContext };

export type Statement = Type | Value | Eval;

export type Program = { type: 'Program'; statements: Statement[]; ctx: ParserRuleContext };
