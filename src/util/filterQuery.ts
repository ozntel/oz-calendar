/**
 * A small query language for filtering calendar notes, modelled on Obsidian Search syntax.
 * It only looks at data that is already in memory (file name, path, tags, properties), never at note content.
 *
 *   meeting                 file name contains "meeting"
 *   "weekly review"         file name contains the exact phrase
 *   file:standup            file name contains "standup"
 *   path:Work/Projects      file path contains "Work/Projects"
 *   tag:#work               note has #work (or a nested tag like #work/client)
 *   [status]                note has the "status" property
 *   [type:meeting]          "type" property contains "meeting" (any item, for list properties)
 *   [type:"1:1"]            quoted property value
 *   [due:null]              "due" property exists but is empty
 *   /regex/  file:/^2024/   regular expressions instead of plain text
 *   a b                     both (AND)
 *   a OR b                  either
 *   -a  -tag:#archive       not
 *   (a OR b) -c             grouping
 *
 * Text matching is case-insensitive.
 */

export interface FilterContext {
	/** File name without extension */
	name: string;
	path: string;
	/** Tags with leading "#", including frontmatter tags */
	tags: string[];
	frontmatter: Record<string, unknown> | undefined;
}

type Matcher = { kind: 'text'; value: string } | { kind: 'regex'; regex: RegExp };

type FilterNode =
	| { type: 'and' | 'or'; children: FilterNode[] }
	| { type: 'not'; child: FilterNode }
	| { type: 'field'; field: 'file' | 'path' | 'tag'; matcher: Matcher }
	| { type: 'property'; key: string; matcher: Matcher | 'exists' | 'empty' };

export type CompiledFilter = (context: FilterContext) => boolean;

export class FilterQueryError extends Error {}

/* ------------- Tokenizer ------------- */

type Token =
	| { type: 'lparen' | 'rparen' | 'or' | 'not' }
	| { type: 'term'; text: string; quoted: boolean; regex: boolean }
	| { type: 'operator'; name: string; text: string; quoted: boolean; regex: boolean }
	| { type: 'property'; raw: string };

const SUPPORTED_OPERATORS = ['file', 'path', 'tag'];
// Obsidian Search operators that need the note content, which this filter does not read
const UNSUPPORTED_OPERATORS = [
	'content',
	'line',
	'block',
	'section',
	'task',
	'task-todo',
	'task-done',
	'match-case',
	'ignore-case',
];

const tokenize = (query: string): Token[] => {
	const tokens: Token[] = [];
	let i = 0;

	// Reads a "quoted" or /regex/ value starting at position i (on the opening character)
	const readDelimited = (delimiter: '"' | '/'): string => {
		let value = '';
		i++;
		while (i < query.length && query[i] !== delimiter) {
			if (query[i] === '\\' && i + 1 < query.length) {
				// Keep escapes for regexes (\d, \/ ...), unescape for quoted strings
				value += delimiter === '/' && query[i + 1] !== '/' ? query[i] + query[i + 1] : query[i + 1];
				i += 2;
				continue;
			}
			value += query[i++];
		}
		if (i >= query.length) {
			throw new FilterQueryError(delimiter === '"' ? 'Missing closing quote (")' : 'Missing closing / in regex');
		}
		i++;
		return value;
	};

	while (i < query.length) {
		const char = query[i];
		if (/\s/.test(char)) {
			i++;
		} else if (char === '(') {
			tokens.push({ type: 'lparen' });
			i++;
		} else if (char === ')') {
			tokens.push({ type: 'rparen' });
			i++;
		} else if (char === '-' && i + 1 < query.length && !/[\s)]/.test(query[i + 1])) {
			tokens.push({ type: 'not' });
			i++;
		} else if (char === '"' || char === '/') {
			const regex = char === '/';
			tokens.push({ type: 'term', text: readDelimited(char), quoted: !regex, regex });
		} else if (char === '[') {
			let raw = '';
			let inQuote = false;
			i++;
			while (i < query.length && (inQuote || query[i] !== ']')) {
				if (query[i] === '"') inQuote = !inQuote;
				raw += query[i++];
			}
			if (i >= query.length) throw new FilterQueryError('Missing closing ] in property filter');
			i++;
			tokens.push({ type: 'property', raw });
		} else {
			let word = '';
			while (i < query.length && !/[\s()"]/.test(query[i])) word += query[i++];
			const operatorMatch = word.match(/^([a-z-]+):(.*)$/i);
			const operatorName = operatorMatch?.[1].toLowerCase();
			if (operatorMatch && operatorName && UNSUPPORTED_OPERATORS.indexOf(operatorName) !== -1) {
				throw new FilterQueryError(`"${operatorName}:" is not supported, the filter does not read note content`);
			}
			if (operatorMatch && operatorName && SUPPORTED_OPERATORS.indexOf(operatorName) !== -1) {
				let text = operatorMatch[2];
				let quoted = false;
				let regex = false;
				if (text === '' && (query[i] === '"' || query[i] === '/')) {
					regex = query[i] === '/';
					quoted = !regex;
					text = readDelimited(query[i] as '"' | '/');
				} else if (text.length > 1 && text.startsWith('/') && text.endsWith('/')) {
					regex = true;
					text = text.slice(1, -1);
				}
				if (text === '') throw new FilterQueryError(`"${operatorName}:" needs a value`);
				tokens.push({ type: 'operator', name: operatorName, text, quoted, regex });
			} else if (word === 'OR') {
				tokens.push({ type: 'or' });
			} else {
				tokens.push({ type: 'term', text: word, quoted: false, regex: false });
			}
		}
	}
	return tokens;
};

/* ------------- Parser ------------- */

const toMatcher = (text: string, regex: boolean): Matcher => {
	if (!regex) return { kind: 'text', value: text.toLowerCase() };
	try {
		return { kind: 'regex', regex: new RegExp(text, 'i') };
	} catch (e) {
		throw new FilterQueryError(`Invalid regex /${text}/`);
	}
};

const parseProperty = (raw: string): FilterNode => {
	const colonIndex = raw.indexOf(':');
	const key = (colonIndex === -1 ? raw : raw.slice(0, colonIndex)).trim();
	if (key === '') throw new FilterQueryError('Property filter needs a name, e.g. [status]');
	if (colonIndex === -1) return { type: 'property', key, matcher: 'exists' };

	let value = raw.slice(colonIndex + 1).trim();
	if (value === 'null') return { type: 'property', key, matcher: 'empty' };
	let regex = false;
	if (value.length > 1 && value.startsWith('"') && value.endsWith('"')) {
		value = value.slice(1, -1);
	} else if (value.length > 1 && value.startsWith('/') && value.endsWith('/')) {
		value = value.slice(1, -1);
		regex = true;
	}
	if (value === '') return { type: 'property', key, matcher: 'exists' };
	return { type: 'property', key, matcher: toMatcher(value, regex) };
};

const parse = (tokens: Token[]): FilterNode | null => {
	let position = 0;
	const peek = () => tokens[position];

	const parseOr = (): FilterNode => {
		const children = [parseAnd()];
		while (peek()?.type === 'or') {
			position++;
			children.push(parseAnd());
		}
		return children.length === 1 ? children[0] : { type: 'or', children };
	};

	const parseAnd = (): FilterNode => {
		const children: FilterNode[] = [];
		while (position < tokens.length && peek().type !== 'or' && peek().type !== 'rparen') {
			children.push(parseUnary());
		}
		if (children.length === 0) throw new FilterQueryError('Expected a search term');
		return children.length === 1 ? children[0] : { type: 'and', children };
	};

	const parseUnary = (): FilterNode => {
		const token = tokens[position++];
		switch (token.type) {
			case 'not':
				if (position >= tokens.length) throw new FilterQueryError('Expected a term after "-"');
				return { type: 'not', child: parseUnary() };
			case 'lparen': {
				const inner = parseOr();
				if (peek()?.type !== 'rparen') throw new FilterQueryError('Missing closing parenthesis');
				position++;
				return inner;
			}
			case 'term':
				return { type: 'field', field: 'file', matcher: toMatcher(token.text, token.regex) };
			case 'operator': {
				let text = token.text;
				if (token.name === 'tag' && !token.regex) text = text.replace(/^#/, '');
				return {
					type: 'field',
					field: token.name as 'file' | 'path' | 'tag',
					matcher: toMatcher(text, token.regex),
				};
			}
			case 'property':
				return parseProperty(token.raw);
			default:
				throw new FilterQueryError(token.type === 'rparen' ? 'Unexpected ")"' : 'Unexpected "OR"');
		}
	};

	if (tokens.length === 0) return null;
	const root = parseOr();
	if (position < tokens.length) throw new FilterQueryError('Unexpected ")"');
	return root;
};

/* ------------- Evaluation ------------- */

const matchText = (matcher: Matcher, text: string): boolean => {
	return matcher.kind === 'text' ? text.toLowerCase().indexOf(matcher.value) !== -1 : matcher.regex.test(text);
};

const isEmptyValue = (value: unknown) =>
	value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0);

const findPropertyValue = (frontmatter: Record<string, unknown> | undefined, key: string) => {
	if (!frontmatter) return { found: false, value: undefined };
	const lowerKey = key.toLowerCase();
	for (const k of Object.keys(frontmatter)) {
		if (k.toLowerCase() === lowerKey) return { found: true, value: frontmatter[k] };
	}
	return { found: false, value: undefined };
};

const evaluate = (node: FilterNode, context: FilterContext): boolean => {
	switch (node.type) {
		case 'and':
			return node.children.every((child) => evaluate(child, context));
		case 'or':
			return node.children.some((child) => evaluate(child, context));
		case 'not':
			return !evaluate(node.child, context);
		case 'field':
			if (node.field === 'file') return matchText(node.matcher, context.name);
			if (node.field === 'path') return matchText(node.matcher, context.path);
			return context.tags.some((tag) => {
				const bareTag = tag.replace(/^#/, '');
				if (node.matcher.kind === 'regex') return node.matcher.regex.test(bareTag);
				const lowerTag = bareTag.toLowerCase();
				return lowerTag === node.matcher.value || lowerTag.startsWith(node.matcher.value + '/');
			});
		case 'property': {
			const { found, value } = findPropertyValue(context.frontmatter, node.key);
			if (!found) return false;
			if (node.matcher === 'exists') return true;
			if (node.matcher === 'empty') return isEmptyValue(value);
			const matcher = node.matcher;
			const values: unknown[] = Array.isArray(value) ? value : [value];
			return values.some((item) => !isEmptyValue(item) && matchText(matcher, String(item)));
		}
	}
};

/**
 * Compiles a query into a function that tests a note. Returns null for an empty query (no filter).
 * Throws FilterQueryError with a readable message when the query is invalid.
 */
export const compileFilterQuery = (query: string): CompiledFilter | null => {
	const root = parse(tokenize(query));
	if (!root) return null;
	return (context: FilterContext) => evaluate(root, context);
};
