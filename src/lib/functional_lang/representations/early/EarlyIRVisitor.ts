import { ParserRuleContext } from 'antlr4ng';
import { NodeType, Statement, TypeExpression, ValueExpression } from './EarlyIRTypes';

export abstract class EarlyIRVisitor<Result> {
	abstract visitTypeAlias(v: {
		type: 'TypeAlias';
		id: string;
		expression: TypeExpression;
		ctx: ParserRuleContext;
	}): Result;
	abstract visitTypeAtomic(v: {
		type: 'TypeAtomic';
		id: string;
		atomic: true;
		ctx: ParserRuleContext;
	}): Result;
	abstract visitTypeExpressionType(v: {
		type: 'TypeExpressionType';
		id: string;
		ctx: ParserRuleContext;
	}): Result;
	abstract visitTypeExpressionArrow(v: {
		type: 'TypeExpressionArrow';
		argumentType: TypeExpression;
		returnType: TypeExpression;
		ctx: ParserRuleContext;
	}): Result;
	abstract visitValueAssignment(v: {
		type: 'ValueAssignment';
		id: string;
		expression: ValueExpression;
		value_type: TypeExpression;
		ctx: ParserRuleContext;
	}): Result;
	abstract visitValueAtomic(v: {
		type: 'ValueAtomic';
		id: string;
		atomic: true;
		value_type: TypeExpression;
		ctx: ParserRuleContext;
	}): Result;
	abstract visitValueExpressionValue(v: {
		type: 'ValueExpressionValue';
		id: string;
		ctx: ParserRuleContext;
	}): Result;
	abstract visitValueExpressionApplication(v: {
		type: 'ValueExpressionApplication';
		function: ValueExpression;
		argument: ValueExpression;
		ctx: ParserRuleContext;
	}): Result;
	abstract visitValueExpressionAbstraction(v: {
		type: 'ValueExpressionAbstraction';
		arguments: string[];
		expression: ValueExpression;
		ctx: ParserRuleContext;
	}): Result;
	abstract visitEval(v: {
		type: 'Eval';
		expression: ValueExpression;
		ctx: ParserRuleContext;
	}): Result;
	abstract visitProgram(v: {
		type: 'Program';
		statements: Statement[];
		ctx: ParserRuleContext;
	}): Result;

	visit(v: any): Result {
		const type = v.type;
		switch (type as NodeType) {
			case 'TypeAlias':
				return this.visitTypeAlias(v);
			case 'TypeAtomic':
				return this.visitTypeAtomic(v);
			case 'TypeExpressionType':
				return this.visitTypeExpressionType(v);
			case 'TypeExpressionArrow':
				return this.visitTypeExpressionArrow(v);
			case 'ValueAssignment':
				return this.visitValueAssignment(v);
			case 'ValueAtomic':
				return this.visitValueAtomic(v);
			case 'ValueExpressionValue':
				return this.visitValueExpressionValue(v);
			case 'ValueExpressionApplication':
				return this.visitValueExpressionApplication(v);
			case 'ValueExpressionAbstraction':
				return this.visitValueExpressionAbstraction(v);
			case 'Eval':
				return this.visitEval(v);
			case 'Program':
				return this.visitProgram(v);
			default:
				throw new Error(`Node with type ${type} is invalid`);
		}
	}
}
