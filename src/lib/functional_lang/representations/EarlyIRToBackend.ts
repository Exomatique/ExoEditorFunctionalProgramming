import { Diagnostic } from '@codemirror/lint';
import { EarlyIRVisitor } from './early/EarlyIRVisitor';
import { Statement, TypeExpression, ValueExpression } from './early/EarlyIRTypes';
import { SymbolTable } from './backend/SymbolTable';
import { EarlyIRPrettyPrinterVisitor } from './early/EarlyIRPrettyPrint';
import { ParserRuleContext } from 'antlr4ng';
import {
	Type as BackendType,
	TypeExpression as BackendTypeExpression,
	Value as BackendValue,
	ValueExpression as BackendValueExpression,
	Eval as BackendEval,
	Program as BackendProgram,
	Statement as BackendStatement
} from './backend/BackendTypes';
import { BackendIRPrettyPrinterVisitor } from './backend/BackendIRPrettyPrint';
import { AbstractionContext } from '../../../generated/grammar/FunctionalGrammarParser';

export interface HoverData {
	from: number;
	to: number;
	message: string;
}

interface ToBeUnifiedAnnotation {
	from: number;
	to: number;
	value: BackendValueExpression;
}

export class EarlyIRToBackend extends EarlyIRVisitor<any> {
	current_type: BackendTypeExpression | undefined;
	table: SymbolTable = new SymbolTable();
	pretty_printer: EarlyIRPrettyPrinterVisitor = new EarlyIRPrettyPrinterVisitor();
	backend_pretty_printer: BackendIRPrettyPrinterVisitor = new BackendIRPrettyPrinterVisitor();
	diagnostics: Diagnostic[] = [];
	toBeUnifiedAnnotation: ToBeUnifiedAnnotation[] = [];
	annotation_list: HoverData[] = [];

	visitTypeAtomic(v: {
		type: 'TypeAtomic';
		id: string;
		atomic: true;
		ctx: ParserRuleContext;
	}): BackendType {
		if (this.table.lookupValue(v.id)) {
			this.error_diagnostic(v.ctx, `Type ${v.id} is already defined before`);
		}
		this.table.newType(v);
		return {
			atomic: true,
			id: v.id,
			type: 'TypeAtomic'
		};
	}

	visitTypeAlias(v: {
		type: 'TypeAlias';
		id: string;
		expression: TypeExpression;
		ctx: ParserRuleContext;
	}): BackendType {
		const type_expression = this.visit(v.expression) as BackendTypeExpression;
		const type: BackendType = {
			type: 'TypeAlias',
			id: v.id,
			expression: type_expression
		};
		if (this.table.lookupValue(v.id)) {
			this.error_diagnostic(v.ctx, `Type ${v.id} is already defined before`);
		}
		this.table.newType(type);

		return type;
	}

	visitTypeExpressionType(v: {
		type: 'TypeExpressionType';
		id: string;
		ctx: ParserRuleContext;
	}): BackendTypeExpression {
		const type_value = this.table.lookupType(v.id);
		if (!type_value) {
			this.error_diagnostic(v.ctx, `Unknown type ${v.id}`);
			throw new Error();
		}

		return {
			type: 'TypeExpressionType',
			id: v.id
		};
	}

	visitTypeExpressionArrow(v: {
		type: 'TypeExpressionArrow';
		argumentType: TypeExpression;
		returnType: TypeExpression;
		ctx: ParserRuleContext;
	}): BackendTypeExpression {
		const argument_expression_type = this.visit(v.argumentType) as BackendTypeExpression;
		const return_expression_type = this.visit(v.returnType) as BackendTypeExpression;

		return {
			type: 'TypeExpressionArrow',
			argumentType: argument_expression_type,
			returnType: return_expression_type
		};
	}

	visitValueAtomic(v: {
		type: 'ValueAtomic';
		id: string;
		atomic: true;
		value_type: TypeExpression;
		ctx: ParserRuleContext;
	}): BackendValue {
		const value: BackendValue = {
			type: 'ValueAtomic',
			id: v.id,
			atomic: true,
			value_type: this.visit(v.value_type) as TypeExpression
		};
		if (this.table.lookupValue(value.id)) {
			this.error_diagnostic(v.ctx, `Value ${value.id} is already defined before`);
		}
		this.table.newValue(value);
		return value;
	}

	visitValueAssignment(v: {
		type: 'ValueAssignment';
		id: string;
		expression: ValueExpression;
		value_type: TypeExpression;
		ctx: ParserRuleContext;
	}): BackendValue {
		const value_type = this.visit(v.value_type) as BackendTypeExpression;

		this.current_type = this.evaluate_type(value_type);

		const expression = this.visit(v.expression) as BackendValueExpression;
		const value: BackendValue = {
			type: 'ValueAssignment',
			id: v.id,
			expression,
			value_type
		};

		this.table.newValue(value);

		return value;
	}

	visitValueExpressionValue(v: {
		type: 'ValueExpressionValue';
		id: string;
		ctx: ParserRuleContext;
	}): BackendValueExpression {
		const value_ref: BackendValue | undefined = this.table.lookupValue(v.id);

		// Check value exists in scope
		if (!value_ref) {
			this.error_diagnostic(v.ctx, `Unknown value ${v.id}`);
			throw new Error();
		}

		if (this.current_type?.type === 'TypeExpressionGeneric') {
			this.table.newGenericConstraint(this.current_type.generic_id, value_ref.value_type);
		} else if (
			!this.table.checkTypeEquality(
				this.evaluate_type(value_ref.value_type),
				this.evaluate_type(this.current_type as BackendTypeExpression)
			)
		) {
			// Check if type is valid
			this.error_diagnostic(
				v.ctx,
				`Value type : ${this.backend_pretty_printer.visit(value_ref.value_type)}, expected type4 : ${this.backend_pretty_printer.visit(this.current_type)}`
			);
		}

		this.annotation(v.ctx, {
			type: 'ValueExpressionValue',
			id: v.id,
			value_type: this.current_type as BackendTypeExpression
		});

		if (value_ref.type === 'ValueAssignment') {
			return value_ref.expression;
		}

		return {
			type: 'ValueExpressionValue',
			id: v.id,
			value_type: value_ref.value_type
		};
	}

	visitValueExpressionApplication(v: {
		type: 'ValueExpressionApplication';
		function: ValueExpression;
		argument: ValueExpression;
		ctx: ParserRuleContext;
	}): BackendValueExpression {
		const current_typeCopy = this.current_type as BackendTypeExpression;

		this.table.enterScope();
		const generic_type = this.table.newGenericType();

		this.current_type = {
			type: 'TypeExpressionArrow',
			argumentType: generic_type,
			returnType: current_typeCopy
		};
		const function_value = this.visit(v.function) as BackendValueExpression;
		function_value.value_type = this.evaluate_type(function_value.value_type);

		this.current_type = generic_type;
		const argument_value = this.visit(v.argument) as BackendValueExpression;
		argument_value.value_type = this.evaluate_type(argument_value.value_type);

		if (function_value.value_type.type === 'TypeExpressionGeneric') {
			this.table.newGenericConstraint(function_value.value_type.generic_id, {
				type: 'TypeExpressionArrow',
				argumentType: argument_value.value_type,
				returnType: current_typeCopy
			});
		} else if (function_value.value_type.type !== 'TypeExpressionArrow') {
			const expected_type: BackendTypeExpression = {
				type: 'TypeExpressionArrow',
				argumentType: argument_value.value_type,
				returnType: current_typeCopy as BackendTypeExpression
			};

			this.error_diagnostic(
				v.function.ctx,
				`Value type : ${this.backend_pretty_printer.visit(function_value.value_type)}, expected type1 : ${this.backend_pretty_printer.visit(expected_type)}`
			);
		} else if (
			!this.table.checkTypeEquality(
				this.evaluate_type(argument_value.value_type),
				this.evaluate_type(function_value.value_type.argumentType)
			)
		) {
			this.error_diagnostic(
				v.argument.ctx,
				`Value type : ${this.backend_pretty_printer.visit(argument_value.value_type)}, expected type2 : ${this.backend_pretty_printer.visit(function_value.value_type.argumentType)}`
			);
		}

		if (!this.table.unifyGeneric(generic_type.generic_id)) {
			this.error_diagnostic(
				v.function.ctx,
				`Value type of ${this.pretty_printer.visit(v.function)} could not be determined (Unification failed)`
			);
			this.toBeUnifiedAnnotation = this.toBeUnifiedAnnotation.filter(
				(v) => !JSON.stringify(v).includes(JSON.stringify(generic_type))
			);
		}

		this.table.exitScope();

		const value: BackendValueExpression = {
			type: 'ValueExpressionApplication',
			argument: argument_value,
			function: function_value,
			value_type: current_typeCopy
		};

		this.annotation(v.ctx, value);

		return this.table.applyUnificationToValueTree(value);
	}

	visitValueExpressionAbstraction(v: {
		type: 'ValueExpressionAbstraction';
		arguments: string[];
		expression: ValueExpression;
		ctx: ParserRuleContext;
	}): BackendValueExpression {
		if (this.current_type?.type !== 'TypeExpressionArrow') {
			this.error_diagnostic(
				v.ctx,
				`Value : ${this.pretty_printer.visit(v.ctx)} is a function, expected type3 : ${this.pretty_printer.visit(this.current_type)}`
			);

			throw new Error();
		}

		this.table.enterScope();
		const type_copy = this.current_type;

		const arg_type = this.current_type.argumentType;

		if (this.table.lookupValue(v.arguments[0])) {
			this.error_diagnostic(v.ctx, `Value ${v.arguments[0]} is already defined before`);
		}

		this.table.newValue({
			atomic: true,
			id: v.arguments[0],
			value_type: arg_type,
			type: 'ValueAtomic'
		});

		this.annotation_list.push({
			from: (v.ctx as AbstractionContext).start?.start || 0,
			to: ((v.ctx as AbstractionContext).stop?.stop || 0) + 1,
			message: v.arguments[0] + ' : ' + this.backend_pretty_printer.visit(arg_type)
		});

		this.current_type = this.evaluate_type(this.current_type.returnType);

		const value: BackendValueExpression = {
			type: 'ValueExpressionAbstraction',
			argument: v.arguments[0],
			value_type: type_copy,
			expression:
				v.arguments.length === 1
					? this.visit(v.expression)
					: this.visitValueExpressionAbstraction({
							arguments: v.arguments.slice(1),
							ctx: v.ctx,
							type: 'ValueExpressionAbstraction',
							expression: v.expression
						})
		};

		this.table.exitScope();

		this.annotation(v.ctx, value);

		return value;
	}

	visitEval(v: { type: 'Eval'; expression: ValueExpression; ctx: ParserRuleContext }): BackendEval {
		this.table.enterScope();
		const generic_type = this.table.newGenericType();

		this.current_type = generic_type;

		const expression = this.visit(v.expression) as BackendValueExpression;

		const type = this.table.unifyGeneric(generic_type.generic_id);

		if (!type) {
			this.error_diagnostic(
				v.ctx,
				`Value type of ${this.pretty_printer.visit(v.ctx)} could not be determined (Unification failed)`
			);

			throw new Error();
		}

		expression.value_type = type;
		this.table.exitScope();

		return {
			type: 'Eval',
			expression: expression,
			value_type: type
		};
	}

	evaluate_type(type: BackendTypeExpression): BackendTypeExpression {
		switch (type.type) {
			case 'TypeExpressionType': {
				const lookuped_type = this.table.lookupType(type.id);
				if (!lookuped_type) throw new Error('Unknown type');
				switch (lookuped_type.type) {
					case 'TypeAlias':
						return lookuped_type.expression;
					case 'TypeAtomic':
						return type;
				}
			}
			case 'TypeExpressionArrow':
				return type;
			case 'TypeExpressionGeneric':
				const unified = this.table.unifyGeneric(type.generic_id);
				return unified ? this.evaluate_type(unified) : type;
		}
	}

	visitProgram(v: {
		type: 'Program';
		statements: Statement[];
		ctx: ParserRuleContext;
	}): BackendProgram {
		const thisCopy = this;
		return {
			type: 'Program',
			statements: v.statements.map((v) => {
				thisCopy.toBeUnifiedAnnotation = [];
				const statement = thisCopy.visit(v) as BackendStatement;

				this.annotation_list.push(
					...thisCopy.toBeUnifiedAnnotation
						.map((v) => ({ ...v, value: this.table.applyUnificationToValueTree(v.value) }))
						.map((v): HoverData => {
							return {
								from: v.from,
								to: v.to,
								message:
									this.backend_pretty_printer.visit(v.value) +
									' : ' +
									thisCopy.backend_pretty_printer.visit(v.value.value_type)
							};
						})
				);

				return statement;
			})
		};
	}

	error_diagnostic(ctx: ParserRuleContext, message: string): void {
		this.diagnostics.push({
			from: ctx.start?.start || 0,
			to: (ctx.stop?.stop || 0) + 1,
			severity: 'error',
			message
		});
	}

	annotation(ctx: ParserRuleContext, expression: BackendValueExpression): void {
		this.toBeUnifiedAnnotation.push({
			from: ctx.start?.start || 0,
			to: (ctx.stop?.stop || 0) + 1,
			value: expression
		});
	}
}
