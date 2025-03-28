import { Type, TypeExpression, Value } from './BackendTypes';

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
				if (element.collapsed_generic.has(generic_id)) {
					error = true;
					break;
				}
				element.collapsed_generic.set(generic_id, constraint);
				error = false;
			}
		}

		return !error ? element.collapsed_generic.get(generic_id) : undefined;
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

	checkTypeEquality(type1: TypeExpression, type2: TypeExpression): boolean {
		if (type1.type === 'TypeExpressionGeneric') {
			this.newGenericConstraint(type1.generic_id, type2);
			return true;
		}
		if (type2.type === 'TypeExpressionGeneric') {
			this.newGenericConstraint(type2.generic_id, type1);
			return true;
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

		console.log(type1);
		console.log(type2);

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
