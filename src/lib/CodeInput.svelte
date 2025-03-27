<script lang="ts">
	import CodeMirror from 'svelte-codemirror-editor';
	import { functional } from './highlighter/FunctionalHighlighter';
	import { dracula } from '@ddietr/codemirror-themes/dracula';
	import { functionalLinter } from './highlighter/FunctionalHighlighting';

	let { value = $bindable(''), editable }: { value: string; editable: boolean } = $props();
</script>

<CodeMirror bind:value lang={functional()} extensions={[functionalLinter]} theme={dracula} />
