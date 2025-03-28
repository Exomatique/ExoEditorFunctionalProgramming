import { type Diagnostic, linter } from '@codemirror/lint';
import { CharStream, CommonTokenStream } from 'antlr4ng';
import { FunctionalGrammarLexer } from '../../generated/grammar/FunctionalGrammarLexer';
import {
	FunctionalGrammarParser,
	ProgramContext
} from '../../generated/grammar/FunctionalGrammarParser';
import { EarlyIRToBackend, HoverData } from './representations/EarlyIRToBackend';
import FrontendToIRVisitor from './representations/FrontendToEarlyIRVisitor';
import { EditorView, hoverTooltip, Tooltip } from '@codemirror/view';

export const functionalExtensions = () => {
	let hoverData: HoverData[] = [];

	const functionalLinter = linter((view) => {
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
				visitor.visitProgram(earlyId);
			} catch (e) {
			} finally {
				hoverData = visitor.annotation_list;
				diagnostics.push(...visitor.diagnostics);
			}
		}

		parser.program();

		return diagnostics;
	});

	const functionalHoverer = hoverTooltip((view, pos, side): Tooltip[] => {
		return hoverData
			.filter((v) => v.from <= pos && pos < v.to)
			.map((v) => {
				return {
					pos: pos,
					end: v.to,
					above: true,
					strictSide: true,
					arrow: true,
					create: () => {
						let dom = document.createElement('div');
						dom.className = 'cm-tooltip-cursor';
						dom.textContent = v.typeValue;
						return { dom };
					}
				};
			});
	});

	const cursorTooltipBaseTheme = EditorView.baseTheme({
		'.cm-tooltip-cursor': {
			backgroundColor: 'black',
			color: 'white',
			border: 'none',
			padding: '2px 7px',
			borderRadius: '4px',
			'& .cm-tooltip-arrow:before': {
				borderTopColor: '#66b'
			},
			'& .cm-tooltip-arrow:after': {
				borderTopColor: 'transparent'
			}
		}
	});

	return [functionalLinter, functionalHoverer, cursorTooltipBaseTheme];
};
