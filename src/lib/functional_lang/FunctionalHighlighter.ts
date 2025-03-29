import { LanguageSupport, LRLanguage } from '@codemirror/language';
import { parser } from '../../generated/highlighter';
import { styleTags, tags as t } from '@lezer/highlight';

export const FunctionalLanguage = LRLanguage.define({
	parser: parser.configure({
		props: [
			styleTags({
				VAL_ID: t.variableName,
				TYPE_ID: t.typeName,
				TYPE: t.keyword,
				VAL: t.keyword,
				EVAL: t.keyword,
				ABSTRACTION_ARROW: t.typeOperator,
				TYPE_ARROW: t.typeOperator,
				BlockComment: t.blockComment,
				LINE_COMMENT: t.lineComment,
				SEMI: t.separator,
				'{ }': t.brace,
				'( )': t.paren
			})
		]
	}),
	languageData: {
		commentTokens: { line: '//', block: { open: '/*', close: '*/' } }
	}
});

export function functional() {
	return new LanguageSupport(FunctionalLanguage);
}
