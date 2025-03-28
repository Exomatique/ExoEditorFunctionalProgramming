import { type Diagnostic, linter } from '@codemirror/lint';
import { CharStream, CommonTokenStream } from 'antlr4ng';
import { FunctionalGrammarLexer } from '../../generated/grammar/FunctionalGrammarLexer';
import {
	FunctionalGrammarParser,
	ProgramContext
} from '../../generated/grammar/FunctionalGrammarParser';
import { EarlyIRToBackend } from '../functional_lang/representations/EarlyIRToBackend';
import FrontendToIRVisitor from '../functional_lang/representations/FrontendToEarlyIRVisitor';

export const functionalLinter = linter((view) => {
	let diagnostics: Diagnostic[] = [];

	const charstream = CharStream.fromString(view.state.doc.toString());
	const lexer = new FunctionalGrammarLexer(charstream);

	lexer.addErrorListener({
		syntaxError(recognizer, offendingSymbol, line, charPositionInLine, msg, e) {
			diagnostics.push({
				from: offendingSymbol?.start || 0,
				to: (offendingSymbol?.stop || 0) + 1,
				severity: 'error',
				message: msg
			});
		},
		reportAmbiguity(recognizer, dfa, startIndex, stopIndex, exact, ambigAlts, configs) {},
		reportAttemptingFullContext(
			recognizer,
			dfa,
			startIndex,
			stopIndex,
			conflictingAlts,
			configs
		) {},
		reportContextSensitivity(recognizer, dfa, startIndex, stopIndex, prediction, configs) {}
	});

	const lexemeStream = new CommonTokenStream(lexer);

	const parser = new FunctionalGrammarParser(lexemeStream);

	parser.addErrorListener({
		syntaxError(recognizer, offendingSymbol, line, charPositionInLine, msg, e) {
			diagnostics.push({
				from: offendingSymbol?.start || 0,
				to: (offendingSymbol?.stop || 0) + 1,
				severity: 'error',
				message: msg
			});
		},
		reportAmbiguity(recognizer, dfa, startIndex, stopIndex, exact, ambigAlts, configs) {},
		reportAttemptingFullContext(
			recognizer,
			dfa,
			startIndex,
			stopIndex,
			conflictingAlts,
			configs
		) {},
		reportContextSensitivity(recognizer, dfa, startIndex, stopIndex, prediction, configs) {}
	});

	const program: ProgramContext = parser.program();

	if (diagnostics.length === 0) {
		const visitor = new EarlyIRToBackend();
		try {
			const earlyId = new FrontendToIRVisitor().visitProgram(program);
			console.log(visitor.visitProgram(earlyId));
		} catch (e) {
			console.log(e);
		} finally {
			diagnostics.push(...visitor.diagnostics);
		}
	}

	parser.program();

	return diagnostics;
});
