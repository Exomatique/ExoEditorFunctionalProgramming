<script lang="ts">
	import CodeMirror from 'svelte-codemirror-editor';
	import { dracula } from '@ddietr/codemirror-themes/dracula';
	import { functional } from '../../functional_lang/FunctionalHighlighter';
	import { functionalExtensions } from '../../functional_lang/FunctionalExtensions';
	import { runBlockPlugin } from '../../functional_lang/FunctionalInterpreterExtension';
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
		extensions={[functionalExtensions(), runBlockPlugin]}
		theme={dracula}
		{editable}
	/>
</div>
