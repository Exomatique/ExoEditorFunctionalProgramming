import { FunctionalInterpreter } from './FunctionalInterpreter';
import { BackendIRPrettyPrinterVisitor } from './representations/backend/BackendIRPrettyPrint';
import { Program, Statement } from './representations/backend/BackendTypes';

self.onmessage = async (event) => {
	const input: Program = event.data;
	const backendPretty = new BackendIRPrettyPrinterVisitor();
	const interpreter = new FunctionalInterpreter();
	try {
		let index = 0;
		const interval = setInterval(() => {
			if (index >= input.statements.length) {
				clearInterval(interval);

				self.postMessage({ success: true, finished: true });
				return;
			}
			const statement = interpreter.visit(input.statements[index]) as Statement;

			if (statement.type === 'Eval') {
				self.postMessage({
					success: true,
					data: {
						output: `${backendPretty.visitStatement(statement)} /* TYPE */ : ${backendPretty.visit(statement.value_type)} \n /* VALUE */ = ${backendPretty.visit(statement.expression)}`
					}
				});
			} else {
				self.postMessage({
					success: true,
					data: { output: `${backendPretty.visitStatement(statement)}` }
				});
			}

			index = index + 1;
		}, 250);
	} catch (error) {
		self.postMessage({ success: false, error: (error as any).message });
	}
};
