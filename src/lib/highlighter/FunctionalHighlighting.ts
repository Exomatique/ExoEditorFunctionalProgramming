import { type Diagnostic, linter } from '@codemirror/lint';
import { CharStream, CommonTokenStream } from 'antlr4ng';
import { FunctionalGrammarLexer } from '../../generated/grammar/FunctionalGrammarLexer';
import { FunctionalGrammarParser } from '../../generated/grammar/FunctionalGrammarParser';

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

	parser.program();

	return diagnostics;
});
