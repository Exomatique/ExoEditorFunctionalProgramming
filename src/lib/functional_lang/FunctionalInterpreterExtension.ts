import { EditorState, Extension, Transaction } from '@codemirror/state';

import {
	EditorView,
	ViewPlugin,
	Decoration,
	DecorationSet,
	WidgetType,
	ViewUpdate,
	Command,
	logException,
	KeyBinding,
	hoverTooltip,
	Tooltip,
	showTooltip,
	gutter,
	GutterMarker,
	PanelConstructor,
	Panel,
	showPanel,
	getPanel,
	lineNumberMarkers,
	lineNumbers
} from '@codemirror/view';
import { dracula } from '@ddietr/codemirror-themes/dracula';
import { CharStream, CommonTokenStream } from 'antlr4ng';
import { FunctionalGrammarLexer } from '../../generated/grammar/FunctionalGrammarLexer';
import {
	FunctionalGrammarParser,
	ProgramContext
} from '../../generated/grammar/FunctionalGrammarParser';
import { EarlyIRToBackend } from './representations/EarlyIRToBackend';
import FrontendToIRVisitor from './representations/FrontendToEarlyIRVisitor';
import { Program } from './representations/backend/BackendTypes';
import { javascript } from '@codemirror/lang-javascript';
import { defaultHighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { env } from '$env/dynamic/public';
import { functional } from './FunctionalHighlighter';

export const runBlockPlugin = ViewPlugin.fromClass(
	class {
		header_txt: string = `// Functional Language Interpreter v${import.meta.env.VITE_VERSION}
//
// Warning /!\\ : This language is just a learning tool
`;

		outputView: EditorView | undefined;
		btn: HTMLButtonElement;
		trash: HTMLButtonElement;
		return_div: HTMLElement;
		worker: Worker = new Worker(new URL('./FunctionalInterpreterWorker.ts', import.meta.url), {
			type: 'module'
		});
		timeoutId: number = -1;
		backendRepresentation: Program | undefined;
		outputText: string = '';

		constructor(readonly view: EditorView) {
			let dom = document.createElement('div');
			dom.className = 'relative flex justify-center items-center m-2';

			this.trash = document.createElement('btn') as HTMLButtonElement;
			let trashIcon = document.createElement('i');
			trashIcon.className = 'fa fa-trash';

			this.trash.className =
				'py-4 px-4 btn-icon bg-red-500 hover:bg-red-700 font-bold ounded w-fit btn select-none cursor-pointer invisible';
			this.trash.style.marginLeft = `${34}px`;
			this.trash.onclick = (e) => {
				this.destroy();
			};
			this.trash.appendChild(trashIcon);
			dom.appendChild(this.trash);

			let filler = document.createElement('div');
			filler.className = 'flex-1';
			dom.appendChild(filler);

			this.btn = document.createElement('btn') as HTMLButtonElement;
			this.btn.className =
				'bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-fit btn select-none cursor-pointer';
			this.btn.textContent = 'Run Code';
			this.btn.onclick = (e) => {
				if (this.btn.classList.contains('disabled')) return;
				this.btn.classList.add('disabled', 'cursor-progress');
				this.trash.classList.remove('invisible');

				if (this.outputView) this.outputView.destroy();

				this.outputText = this.header_txt;
				this.outputView = new EditorView({
					parent: this.return_div,
					extensions: [javascript({ typescript: true })]
				});

				this.runInterpreter();
			};
			dom.appendChild(this.btn);
			view.dom.appendChild(dom);

			this.return_div = document.createElement('div');
			this.return_div.classList.add('mx-20');

			view.dom.appendChild(this.return_div);
		}

		runInterpreter() {
			this.btn.classList.add('disabled');
			const thisCopy = this;

			this.worker = new Worker(new URL('./FunctionalInterpreterWorker.ts', import.meta.url), {
				type: 'module'
			});

			function startWorker(input: any) {
				return new Promise((resolve, reject) => {
					if (thisCopy.outputView) {
						thisCopy.outputView.setState(
							EditorState.create({
								doc: thisCopy.outputText,
								extensions: [dracula, functional(), lineNumbers(), EditorState.readOnly.of(true)]
							})
						);
					}

					thisCopy.worker.postMessage(input);

					// Timeout logic: Kill worker if no response in 60s
					thisCopy.timeoutId = setTimeout(() => {
						reject(new Error('Timeout exceeded'));
					}, 60000);

					thisCopy.worker.onmessage = (event) => {
						if (event.data.finished === true) {
							resolve(event.data);
							return;
						}
						thisCopy.outputText += event.data.data.output;

						if (thisCopy.outputView)
							thisCopy.outputView.setState(
								EditorState.create({
									doc: thisCopy.outputText,
									extensions: [dracula, functional(), lineNumbers(), EditorState.readOnly.of(true)]
								})
							);
					};

					thisCopy.worker.onerror = (error) => {
						thisCopy.destroy();
					};
				});
			}

			startWorker(this.backendRepresentation)
				.catch((e) => {
					thisCopy.outputText += '// ' + e.message;
					this.worker.terminate();

					if (thisCopy.outputView)
						thisCopy.outputView.setState(
							EditorState.create({
								doc: thisCopy.outputText,
								extensions: [dracula, functional(), lineNumbers(), EditorState.readOnly.of(true)]
							})
						);
				})
				.finally(() => this.btn.classList.remove('disabled', 'cursor-progress'));
		}

		run() {}

		update(update: ViewUpdate) {
			const txt = update.state.doc.toString();
			let error = false;

			const charstream = CharStream.fromString(txt);
			const lexer = new FunctionalGrammarLexer(charstream);

			lexer.addErrorListener({
				syntaxError(recognizer, offendingSymbol, line, charPositionInLine, msg, e) {
					error = true;
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
					error = true;
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

			if (error) {
				this.backendRepresentation = undefined;
				this.btn.classList.add('disabled', 'cursor-not-allowed');
				return;
			}

			const visitor = new EarlyIRToBackend();
			let backendRepresentation: Program | undefined;
			try {
				const earlyId = new FrontendToIRVisitor().visitProgram(program);
				backendRepresentation = visitor.visitProgram(earlyId);
			} catch (e) {
				error = true;
				e;
			} finally {
				error = visitor.diagnostics.length !== 0;
			}

			if (error) {
				this.backendRepresentation = undefined;
				this.btn.classList.add('disabled', 'cursor-not-allowed');
				return;
			}

			if (JSON.stringify(this.backendRepresentation) === JSON.stringify(backendRepresentation))
				return;
			this.destroy();
			this.backendRepresentation = backendRepresentation;
		}

		destroy() {
			this.worker.terminate();
			this.btn.classList.remove('disabled', 'cursor-progress', 'cursor-not-allowed');
			this.trash.classList.add('invisible');
			if (this.outputView) this.outputView?.destroy();
			clearTimeout(this.timeoutId);
		}
	}
);
