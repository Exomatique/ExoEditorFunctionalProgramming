import type { IExoModule } from '@exomatique/editor';
import TypingBlock from './TypingBlock.svelte';

export default class TypingModule implements IExoModule<String> {
	type = 'functional_typing';
	container = false;
	component = TypingBlock;
	name = 'Typing';
	icon = 'T';
	default_value = () => '';
}
