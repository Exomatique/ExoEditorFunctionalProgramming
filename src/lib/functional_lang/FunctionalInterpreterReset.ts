import { EditorState } from '@codemirror/state';
import { EditorView, ViewPlugin } from '@codemirror/view';

export const resetPlugin = (default_content: string) =>
	ViewPlugin.fromClass(
		class {
			div: HTMLDivElement;
			btn: HTMLButtonElement;

			constructor(readonly view: EditorView) {
				this.div = document.createElement('div') as HTMLDivElement;
				this.div.className = 'flex flex-row justify-end m-5';
				this.btn = document.createElement('btn') as HTMLButtonElement;
				this.btn.className =
					' bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-fit btn select-none cursor-pointer';
				this.btn.textContent = 'Reset';
				this.btn.onclick = (e) => {
					view.update([
						view.state.update({
							changes: { from: 0, to: view.state.doc.length, insert: default_content }
						})
					]);
				};
				this.div.appendChild(this.btn);
				view.dom.insertBefore(this.div, view.dom.firstChild);
			}
		}
	);
