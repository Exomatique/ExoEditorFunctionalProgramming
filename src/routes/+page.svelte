<script lang="ts">
	import { Editor, ExoEditor, type ExoData } from '@exomatique/editor';
	import TypingModule from '../lib/modules/typing/TypingModule';

	const exo_editor = new ExoEditor({
		modules: [new TypingModule()],
		default_module: 'functional_typing'
	});

	let data: ExoData = $state([
		{
			type: 'functional_typing',
			data: 'type X;\ntype Bool = X -> X -> X;\nval true: Bool = {(ifT ifF) => ifT};\nval false: Bool = {(ifT ifF) => ifF};\nval and: Bool -> Bool -> Bool = {(b1 b2 x y) => b1 (b2 x y) y}; eval and true true;',
			id: '91a950d3_1c43_4529_bac6_bc4e5786471a'
		}
	]);

	let editable = $state(true);
</script>

<div class="relative flex h-full flex-1 justify-center">
	<div class="absolute h-full w-3/4 grow flex-row px-20 text-neutral-950 scheme-light">
		<Editor {editable} {exo_editor} bind:data />
	</div>
</div>

{#if editable}
	<button class="btn" onclick={() => (editable = false)}>View</button>
{:else}
	<button class="btn" onclick={() => (editable = true)}>Edit</button>
{/if}
