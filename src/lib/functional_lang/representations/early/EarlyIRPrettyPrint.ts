import { ParserRuleContext } from 'antlr4ng';
import { NodeType, Statement, TypeExpression, ValueExpression } from './EarlyIRTypes';
import { EarlyIRVisitor } from './EarlyIRVisitor';

export class EarlyIRPrettyPrinterVisitor extends EarlyIRVisitor<string> {
	visitTypeAlias(v: {
		type: 'TypeAlias';
		id: string;
		expression: TypeExpression;
		ctx: ParserRuleContext;
	}): string {
		return `type ${v.id} = ${this.visitTypeExpression(v.expression)}`;
	}

	visitTypeAtomic(v: {
		type: 'TypeAtomic';
		id: string;
		atomic: true;
		ctx: ParserRuleContext;
	}): string {
		return `type ${v.id}`;
	}

	visitTypeExpressionType(v: {
		type: 'TypeExpressionType';
		id: string;
		ctx: ParserRuleContext;
	}): string {
		return `${v.id}`;
	}

	visitTypeExpressionArrow(v: {
		type: 'TypeExpressionArrow';
		argumentType: TypeExpression;
		returnType: TypeExpression;
		ctx: ParserRuleContext;
	}): string {
		return `(${this.visitTypeExpression(v.argumentType)} -> ${this.visitTypeExpression(v.returnType)})`;
	}

	visitValueAssignment(v: {
		type: 'ValueAssignment';
		id: string;
		expression: ValueExpression;
		value_type: TypeExpression;
		ctx: ParserRuleContext;
	}): string {
		return `val ${v.id}: ${this.visitTypeExpression(v.value_type)} = ${this.visitValueExpression(v.expression)}`;
	}

	visitValueAtomic(v: {
		type: 'ValueAtomic';
		id: string;
		atomic: true;
		value_type: TypeExpression;
		ctx: ParserRuleContext;
	}): string {
		return `val ${v.id}: ${this.visitTypeExpression(v.value_type)}`;
	}

	visitValueExpressionValue(v: {
		type: 'ValueExpressionValue';
		id: string;
		ctx: ParserRuleContext;
	}): string {
		return `${v.id}`;
	}

	visitValueExpressionApplication(v: {
		type: 'ValueExpressionApplication';
		function: ValueExpression;
		argument: ValueExpression;
		ctx: ParserRuleContext;
	}): string {
		return `(${this.visitValueExpression(v.function)} ${this.visitValueExpression(v.argument)})`;
	}

	visitValueExpressionAbstraction(v: {
		type: 'ValueExpressionAbstraction';
		arguments: string[];
		expression: ValueExpression;
		ctx: ParserRuleContext;
	}): string {
		return `{ (${v.arguments.join(' ')}) => ${this.visitValueExpression(v.expression)} }`;
	}

	visitEval(v: { type: 'Eval'; expression: ValueExpression; ctx: ParserRuleContext }): string {
		return `eval ${this.visitValueExpression(v.expression)};`;
	}

	visitProgram(v: { type: 'Program'; statements: Statement[]; ctx: ParserRuleContext }): string {
		return `${v.statements.map((statement) => this.visitStatement(statement)).join('\n')}`;
	}

	visitStatement(v: any): string {
		const type = v.type;
		switch (type as NodeType) {
			case 'TypeAlias':
				return this.visitTypeAlias(v) + ';';
			case 'TypeAtomic':
				return this.visitTypeAtomic(v) + ';';
			case 'ValueAssignment':
				return this.visitValueAssignment(v) + ';';
			case 'ValueAtomic':
				return this.visitValueAtomic(v) + ';';
			case 'Eval':
				return this.visitEval(v) + ';';
			default:
				throw new Error(`Unsupported statement type ${type}`);
		}
	}

	visitTypeExpression(v: TypeExpression): string {
		switch (v.type) {
			case 'TypeExpressionType':
				return this.visitTypeExpressionType(v);
			case 'TypeExpressionArrow':
				return this.visitTypeExpressionArrow(v);
		}
	}

	visitValueExpression(v: ValueExpression): string {
		switch (v.type) {
			case 'ValueExpressionValue':
				return this.visitValueExpressionValue(v);
			case 'ValueExpressionApplication':
				return this.visitValueExpressionApplication(v);
			case 'ValueExpressionAbstraction':
				return this.visitValueExpressionAbstraction(v);
		}
	}
}
