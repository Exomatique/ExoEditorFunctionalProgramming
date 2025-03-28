import { Token } from 'antlr4ng';
import type {
	Type_expressionContext,
	Type_statementContext,
	Value_statementContext,
	Value_expressionContext,
	ProgramContext,
	StatementContext,
	Eval_statementContext,
	AbstractionContext,
	ArrowContext,
	TypeParenthesisContext,
	TypeContext,
	ApplicationContext,
	TypeAliasContext,
	TypeAtomicContext,
	ValueContext,
	ValueParenthesisContext,
	ValueAssignmentContext,
	ValueAtomicContext
} from '../../../generated/grammar/FunctionalGrammarParser';
import { FunctionalGrammarVisitor } from '../../../generated/grammar/FunctionalGrammarVisitor';
import type {
	Eval,
	Program,
	Statement,
	Type,
	TypeExpression,
	Value,
	ValueExpression
} from './early/EarlyIRTypes';

class VisitingError extends Error {}

export default class FrontendToIRVisitor extends FunctionalGrammarVisitor<any> {
	visitType: (ctx: TypeContext) => TypeExpression = (ctx) => {
		return { id: ctx.TYPE_ID().getText(), type: 'TypeExpressionType', ctx };
	};

	visitTypeParenthesis: (ctx: TypeParenthesisContext) => TypeExpression = (ctx) => {
		return this.visit(ctx._type_ as Type_expressionContext);
	};

	visitArrow: (ctx: ArrowContext) => TypeExpression = (ctx) => {
		return {
			type: 'TypeExpressionArrow',
			argumentType: this.visit(ctx._argument_type as Type_expressionContext),
			returnType: this.visit(ctx._return_type as Type_expressionContext),
			ctx
		};
	};

	visitTypeAlias: (ctx: TypeAliasContext) => Type = (ctx) => {
		return {
			type: 'TypeAlias',
			id: (ctx._type_ as Token).text || '',
			expression: this.visit(ctx._expression as Type_expressionContext),
			ctx
		};
	};

	visitTypeAtomic: (ctx: TypeAtomicContext) => Type = (ctx) => {
		return {
			type: 'TypeAtomic',
			id: (ctx._type_ as Token).text || '',
			atomic: true,
			ctx
		};
	};

	visitValue: (ctx: ValueContext) => ValueExpression = (ctx) => {
		return {
			type: 'ValueExpressionValue',
			id: ctx.VAL_ID().getText(),
			ctx
		};
	};

	visitValueParenthesis: (ctx: ValueParenthesisContext) => ValueExpression = (ctx) => {
		return this.visit(ctx._expression as Value_expressionContext);
	};

	visitApplication: (ctx: ApplicationContext) => ValueExpression = (ctx) => {
		return {
			type: 'ValueExpressionApplication',
			function: this.visit((ctx as any)._function as Value_expressionContext),
			argument: this.visit(ctx._argument as Value_expressionContext),
			ctx
		};
	};

	visitAbstraction: (ctx: AbstractionContext) => ValueExpression = (ctx) => {
		return {
			type: 'ValueExpressionAbstraction',
			arguments: ctx._args
				.map((v) => v.text)
				.filter(Boolean)
				.map((v) => v || ''),
			expression: this.visit(ctx._expression as Value_expressionContext),
			ctx
		};
	};

	visitValueAssignment: (ctx: ValueAssignmentContext) => Value = (ctx) => {
		return {
			type: 'ValueAssignment',
			id: ctx._val?.text || '',
			value_type: this.visit(ctx._type_ as Type_expressionContext),
			expression: this.visit(ctx._expression as Value_expressionContext),
			ctx
		};
	};

	visitValueAtomic: (ctx: ValueAtomicContext) => Value = (ctx) => {
		return {
			type: 'ValueAtomic',
			id: ctx._val?.text || '',
			atomic: true,
			value_type: this.visit(ctx._type_ as Type_expressionContext),
			ctx
		};
	};

	visitEval_statement: (ctx: Eval_statementContext) => Eval = (ctx) => {
		return {
			type: 'Eval',
			expression: this.visit(ctx._expression as Value_expressionContext),
			ctx
		};
	};

	visitProgram: (ctx: ProgramContext) => Program = (ctx) => {
		const thisCopy = this;
		const statements: (Type | Value | Eval)[] = ctx.statement().map((v) => {
			return thisCopy.visit(v);
		});
		return { type: 'Program', statements, ctx };
	};
}
