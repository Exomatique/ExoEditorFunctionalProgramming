<script lang="ts">
	import CodeMirror from 'svelte-codemirror-editor';
	import { functional } from '../../highlighter/FunctionalHighlighter';
	import { dracula } from '@ddietr/codemirror-themes/dracula';
	import { functionalLinter } from '../../highlighter/FunctionalHighlighting';

	let {
		data = $bindable(),
		editable,
		edition
	}: {
		data: string;
		editable: boolean;
		edition: boolean;
	} = $props();
</script>

<div class="relative">
	<CodeMirror
		bind:value={data}
		lang={functional()}
		extensions={[functionalLinter]}
		theme={dracula}
		{editable}
	/>
</div>
