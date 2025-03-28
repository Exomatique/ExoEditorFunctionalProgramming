import { Type, TypeExpression, Value, ValueExpression } from './BackendTypes';

export class SymbolTable {
	stack: SymbolTableLevel[] = [new SymbolTableLevel()];
	generic_count = 0;

	enterScope() {
		this.stack.push(new SymbolTableLevel(this.stack[0]));
	}

	exitScope() {
		this.stack.pop();

		if (this.stack.length === 0) {
			throw new Error('Should not exit global scope');
		}
	}

	newType(type: Type) {
		if (!type.id) throw new Error();
		this.stack[0].types.set(type.id, type);
	}

	newGenericType(): {
		type: 'TypeExpressionGeneric';
		generic_id: number;
	} {
		const generic_id = this.generic_count;
		this.generic_count += 1;

		const type: TypeExpression = {
			type: 'TypeExpressionGeneric',
			generic_id
		};

		this.stack[0].generic_types.set(generic_id, []);

		return type;
	}

	newGenericConstraint(generic_id: number, type: TypeExpression) {
		let element: SymbolTableLevel | undefined = this.stack[0];
		while (element && !element.generic_types.has(generic_id)) element = element.parent;

		if (!element) throw new Error('Unknown generic id');

		const constraints = element.generic_types.get(generic_id) as TypeExpression[];
		constraints.push(type);
		element.generic_types.set(generic_id, constraints);
	}

	unifyGeneric(generic_id: number) {
		let element: SymbolTableLevel | undefined = this.stack[0];
		while (element && !element.generic_types.has(generic_id)) element = element.parent;
		if (!element) throw new Error('Unknown generic id');

		let constraints = element.generic_types.get(generic_id) as TypeExpression[];
		let error = true;

		while (constraints.length !== 0) {
			let constraint = constraints.pop() as TypeExpression;

			if (constraint?.type === 'TypeExpressionGeneric' && constraint.generic_id === generic_id)
				continue;

			if (
				!JSON.stringify(constraint).includes(
					JSON.stringify({ type: 'TypeExpressionGeneric', generic_id } as TypeExpression)
				)
			) {
				if (
					element.collapsed_generic.has(generic_id) &&
					!this.checkTypeEquality(
						element.collapsed_generic.get(generic_id) as TypeExpression,
						constraint,
						false
					)
				) {
					error = true;
					break;
				}
				element.collapsed_generic.set(generic_id, constraint);
				error = false;
			}
		}

		return !error ? element.collapsed_generic.get(generic_id) : undefined;
	}

	applyUnificationToTypeTree(type: TypeExpression): TypeExpression {
		switch (type.type) {
			case 'TypeExpressionType':
				return type;
			case 'TypeExpressionArrow':
				return {
					type: 'TypeExpressionArrow',
					argumentType: this.applyUnificationToTypeTree(type.argumentType),
					returnType: this.applyUnificationToTypeTree(type.returnType)
				};
			case 'TypeExpressionGeneric': {
				const generic_id = type.generic_id;

				let element: SymbolTableLevel | undefined = this.stack[0];
				while (element && !element.generic_types.has(generic_id)) element = element.parent;
				if (!element) throw new Error('Unknown generic id');

				return element.collapsed_generic.get(generic_id) || type;
			}
		}
	}

	applyUnificationToValueTree(value: ValueExpression): ValueExpression {
		switch (value.type) {
			case 'ValueExpressionValue':
				return {
					type: 'ValueExpressionValue',
					value_type: this.applyUnificationToTypeTree(value.value_type),
					id: value.id
				};
			case 'ValueExpressionApplication':
				return {
					type: 'ValueExpressionApplication',
					argument: this.applyUnificationToValueTree(value.argument),
					function: this.applyUnificationToValueTree(value.function),
					value_type: this.applyUnificationToTypeTree(value.value_type)
				};
			case 'ValueExpressionAbstraction':
				return {
					type: 'ValueExpressionAbstraction',
					argument: value.argument,
					expression: this.applyUnificationToValueTree(value.expression),
					value_type: this.applyUnificationToTypeTree(value.value_type)
				};
		}
	}

	newValue(value: Value) {
		if (!value.id) throw new Error();
		this.stack[0].values.set(value.id, value);
	}

	lookupType(name: string): Type | undefined {
		let element: SymbolTableLevel | undefined = this.stack[0];
		while (element && !element.types.has(name)) element = element.parent;

		return element?.types?.get(name);
	}

	lookupValue(name: string): Value | undefined {
		let element: SymbolTableLevel | undefined = this.stack[0];
		while (element && !element.values.has(name)) element = element.parent;

		return element?.values?.get(name);
	}

	checkTypeEquality(
		type1: TypeExpression,
		type2: TypeExpression,
		updateGenerics: boolean = true
	): boolean {
		if (type1.type === 'TypeExpressionGeneric') {
			if (updateGenerics) {
				this.newGenericConstraint(type1.generic_id, type2);
				return true;
			}
			return false;
		}
		if (type2.type === 'TypeExpressionGeneric') {
			if (updateGenerics) {
				this.newGenericConstraint(type2.generic_id, type1);
				return true;
			}
			return false;
		}

		if (type1.type === 'TypeExpressionArrow' && type2.type === 'TypeExpressionArrow') {
			return (
				this.checkTypeEquality(type1.argumentType, type2.argumentType) &&
				this.checkTypeEquality(type1.returnType, type2.returnType)
			);
		}

		if (type1.type === 'TypeExpressionType' && type2.type === 'TypeExpressionType') {
			return type1.id === type2.id;
		}

		return false;
	}
}

export class SymbolTableLevel {
	parent?: SymbolTableLevel;
	values: Map<String, Value> = new Map();
	types: Map<String, Type> = new Map();
	generic_types: Map<number, TypeExpression[]> = new Map();
	collapsed_generic: Map<number, TypeExpression> = new Map();

	constructor(parent?: SymbolTableLevel) {
		this.parent = parent;
	}
}
