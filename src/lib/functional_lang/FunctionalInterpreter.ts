import { ParserRuleContext } from 'antlr4ng';
import {
	Type,
	Value,
	TypeExpression,
	ValueExpression,
	Statement,
	Program,
	Eval
} from './representations/backend/BackendTypes';
import { BackendVisitor } from './representations/backend/BackendVisitor';
import { SymbolTable } from './representations/backend/SymbolTable';

export class FunctionalInterpreter extends BackendVisitor<any> {
	table = new SymbolTable();
	visitTypeAlias(v: { type: 'TypeAlias'; id: string; expression: TypeExpression }): Type {
		this.table.newType(v);
		return v;
	}
	visitTypeAtomic(v: { type: 'TypeAtomic'; id: string; atomic: true }): Type {
		this.table.newType(v);
		return v;
	}
	visitTypeExpressionType(v: { type: 'TypeExpressionType'; id: string }): TypeExpression {
		return v;
	}
	visitTypeExpressionArrow(v: {
		type: 'TypeExpressionArrow';
		argumentType: TypeExpression;
		returnType: TypeExpression;
	}): TypeExpression {
		return v;
	}
	visitValueAssignment(v: {
		type: 'ValueAssignment';
		id: string;
		expression: ValueExpression;
		value_type: TypeExpression;
	}): Value {
		const value = { ...v, expression: this.visit(v.expression) };
		this.table.newValue(value);
		return value;
	}
	visitValueAtomic(v: {
		type: 'ValueAtomic';
		id: string;
		atomic: true;
		value_type: TypeExpression;
	}): Value {
		this.table.newValue(v);
		return v;
	}
	visitValueExpressionValue(v: {
		type: 'ValueExpressionValue';
		id: string;
		value_type: TypeExpression;
	}): ValueExpression {
		return v;
	}
	visitValueExpressionApplication(v: {
		type: 'ValueExpressionApplication';
		function: ValueExpression;
		argument: ValueExpression;
		value_type: TypeExpression;
	}): ValueExpression {
		return { ...v, function: this.visit(v.function), argument: this.visit(v.argument) };
	}
	visitValueExpressionAbstraction(v: {
		type: 'ValueExpressionAbstraction';
		argument: string;
		expression: ValueExpression;
		value_type: TypeExpression;
	}): ValueExpression {
		return { ...v, expression: this.visit(v.expression) };
	}
	visitEval(v: { type: 'Eval'; value_type: TypeExpression; expression: ValueExpression }): Eval {
		return { ...v, expression: this.visit(v.expression) };
	}
	visitProgram(v: { type: 'Program'; statements: Statement[] }): Program {
		const thisCopy = this;
		return { ...v, statements: v.statements.map(thisCopy.visit) };
	}
}
