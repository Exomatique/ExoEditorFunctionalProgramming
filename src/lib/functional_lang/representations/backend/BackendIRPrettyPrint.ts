import { ParserRuleContext } from 'antlr4ng';
import { NodeType, Statement, TypeExpression, ValueExpression } from './BackendTypes';
import { BackendVisitor } from './BackendVisitor';

export class BackendIRPrettyPrinterVisitor extends BackendVisitor<string> {
	visitTypeAlias(v: { type: 'TypeAlias'; id: string; expression: TypeExpression }): string {
		return `type ${v.id} = ${this.visitTypeExpression(v.expression)}`;
	}

	visitTypeAtomic(v: { type: 'TypeAtomic'; id: string; atomic: true }): string {
		return `type ${v.id}`;
	}

	visitTypeExpressionType(v: { type: 'TypeExpressionType'; id: string }): string {
		return `${v.id}`;
	}

	visitTypeExpressionGeneric(v: { type: 'TypeExpressionGeneric'; generic_id: number }): string {
		return `undefined`;
	}

	visitTypeExpressionArrow(v: {
		type: 'TypeExpressionArrow';
		argumentType: TypeExpression;
		returnType: TypeExpression;
	}): string {
		return `(${this.visitTypeExpression(v.argumentType)} -> ${this.visitTypeExpression(v.returnType)})`;
	}

	visitValueAssignment(v: {
		type: 'ValueAssignment';
		id: string;
		expression: ValueExpression;
		value_type: TypeExpression;
	}): string {
		return `val ${v.id}: ${this.visitTypeExpression(v.value_type)} = ${this.visitValueExpression(v.expression)}`;
	}

	visitValueAtomic(v: {
		type: 'ValueAtomic';
		id: string;
		atomic: true;
		value_type: TypeExpression;
	}): string {
		return `val ${v.id}: ${this.visitTypeExpression(v.value_type)}`;
	}

	visitValueExpressionValue(v: {
		type: 'ValueExpressionValue';
		id: string;
		value_type: TypeExpression;
	}): string {
		return `${v.id}`;
	}

	visitValueExpressionApplication(v: {
		type: 'ValueExpressionApplication';
		function: ValueExpression;
		argument: ValueExpression;
		value_type: TypeExpression;
	}): string {
		return `(${this.visitValueExpression(v.function)} ${this.visitValueExpression(v.argument)})`;
	}

	visitValueExpressionAbstraction(v: {
		type: 'ValueExpressionAbstraction';
		argument: string;
		expression: ValueExpression;
		value_type: TypeExpression;
	}): string {
		const args = [v.argument];

		let current = v.expression;
		while (current.type === 'ValueExpressionAbstraction') {
			args.push(current.argument);
			current = current.expression;
		}
		return `{( ${args.join(' ')} ) => ${this.visitValueExpression(current)} }`;
	}

	visitEval(v: { type: 'Eval'; expression: ValueExpression }): string {
		return `eval ${this.visitValueExpression(v.expression)}`;
	}

	visitProgram(v: { type: 'Program'; statements: Statement[] }): string {
		return `${v.statements.map((statement) => this.visitStatement(statement)).join('\n')}`;
	}

	visitStatement(v: any): string {
		const type = v.type;
		switch (type as NodeType) {
			case 'TypeAlias':
				return this.visitTypeAlias(v) + ';\n';
			case 'TypeAtomic':
				return this.visitTypeAtomic(v) + ';\n';
			case 'ValueAssignment':
				return this.visitValueAssignment(v) + ';\n';
			case 'ValueAtomic':
				return this.visitValueAtomic(v) + ';\n';
			case 'Eval':
				return this.visitEval(v) + ';\n';
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
		return 'UNDEFINED';
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
		return 'UNDEFINED';
	}
}
