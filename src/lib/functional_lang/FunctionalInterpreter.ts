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
import { BackendIRPrettyPrinterVisitor } from './representations/backend/BackendIRPrettyPrint';

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
		const value = { ...v, expression: v.expression };
		this.table.newValue(value);
		return value;
	}

	visitTypeExpressionGeneric(v: { type: 'TypeExpressionGeneric'; generic_id: number }) {
		throw new Error();
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
		if (v.function.type === 'ValueExpressionAbstraction') {
			return this.beta_reduction(v.function, v.argument);
		} else if (v.function.type === 'ValueExpressionApplication') {
			return this.visit({
				...v,
				function: this.visit(v.function)
			});
		} /*if (v.function.type === 'ValueExpressionValue') */ else {
			return this.visit({
				...v,
				function: this.table.lookupValue(v.function.id)
			});
		}
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

	unique_id = 0;

	alpha_renaming(v: ValueExpression, x: string, y: string): ValueExpression {
		if (x === y) return v;
		switch (v.type) {
			case 'ValueExpressionValue': {
				return { ...v, id: v.id === x ? y : v.id };
			}
			case 'ValueExpressionApplication': {
				return {
					...v,
					function: this.alpha_renaming(v.function, x, y),
					argument: this.alpha_renaming(v.argument, x, y)
				};
			}
			case 'ValueExpressionAbstraction': {
				let newArgumentId = v.argument;
				if (v.argument === x) {
					newArgumentId = v.argument + "'" + this.unique_id;
					this.unique_id = this.unique_id + 1;
				}

				return {
					...v,
					argument: newArgumentId,
					expression: this.alpha_renaming(
						this.alpha_renaming(v.expression, v.argument, newArgumentId),
						x,
						y
					)
				};
			}
		}
	}

	var_substitution(current: ValueExpression, id: string, v: ValueExpression): ValueExpression {
		switch (current.type) {
			case 'ValueExpressionValue': {
				if (current.id === id) return v;
				return current;
			}
			case 'ValueExpressionApplication': {
				return {
					...current,
					function: this.var_substitution(current.function, id, v),
					argument: this.var_substitution(current.argument, id, v)
				};
			}
			case 'ValueExpressionAbstraction': {
				if (current.argument === id) {
					let [argument, renaming_iter, ...rest] = (current.argument + "'").split("'");

					let newArgumentId = argument + "'" + this.unique_id;
					this.unique_id = this.unique_id + 1;

					return {
						...current,
						argument: newArgumentId,
						expression: this.var_substitution(
							this.alpha_renaming(current.expression, current.argument, newArgumentId),
							id,
							v
						)
					};
				}

				return {
					...current,
					expression: this.var_substitution(current.expression, id, v)
				};
			}
		}
	}

	beta_reduction(
		func: ValueExpression & { type: 'ValueExpressionAbstraction' },
		arg: ValueExpression
	): ValueExpression {
		return this.var_substitution(func.expression, func.argument, arg);
	}
}
