import { BackendIRPrettyPrinterVisitor } from './representations/backend/BackendIRPrettyPrint';
import { Program } from './representations/backend/BackendTypes';

self.onmessage = async (event) => {
	const input: Program = event.data;
	const backendPretty = new BackendIRPrettyPrinterVisitor();
	try {
		let index = 0;
		const interval = setInterval(() => {
			if (index >= input.statements.length) {
				clearInterval(interval);

				self.postMessage({ success: true, finished: true });
				return;
			}
			const statement = input.statements[index];

			self.postMessage({
				success: true,
				data: { output: backendPretty.visitStatement(statement) }
			});
			index = index + 1;
		}, 1000);
		const result = await runInterpreter(input);
	} catch (error) {
		self.postMessage({ success: false, error: (error as any).message });
	}
};

// Simulated interpreter function
async function runInterpreter(input: any) {
	return new Promise((resolve) => {
		resolve({ output: `Processed: ${input}` });
	});
}
