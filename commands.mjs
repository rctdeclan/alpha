// Prototype vocabulary only. Providers receive prior arguments and an optional
// context so document-backed providers can replace fixtures without changing UI.
export const commandGrammars = [
  { verb: 'connect', parts: [{ name: 'from', provider: 'points' }, { name: 'to', provider: 'points' }] },
  { verb: 'move', parts: [{ name: 'target', provider: 'targets' }, { name: 'direction', provider: 'directions' }, { name: 'distance', provider: 'distances' }] },
  { verb: 'keep', parts: [{ name: 'property', provider: 'properties' }, { name: 'view', provider: 'views' }] },
  { verb: 'show', parts: [{ name: 'subject', provider: 'subjects' }] },
  { verb: 'go', parts: [{ name: 'destination', provider: 'destinations' }] },
  { verb: 'insert', parts: [{ name: 'point', provider: 'points' }, { name: 'curve', provider: 'curves' }] },
  { verb: 'subtract', parts: [{ name: 'body', provider: 'bodies' }, { name: 'body', provider: 'bodies' }] },
];
const points = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'];
const curves = ['C1', 'C2', 'C3', 'C4', 'C5'];
const bodies = ['Helmet', 'Shell', 'Visor', 'Crown', 'Jaw'];
const views = ['front', 'side', 'top', 'back', 'perspective'];
export const fakeProviders = {
  points: () => points,
  curves: () => curves,
  bodies: () => bodies,
  views: () => views,
  targets: () => [...points, ...curves, ...bodies],
  directions: () => ['left', 'right', 'up', 'down', 'normal'],
  distances: () => ['1mm', '5mm', '10mm', '20mm', '32mm', '50mm', '100mm'],
  properties: () => ['projection', 'silhouette', 'position', 'direction', 'curvature'],
  subjects: () => ['points', 'curves', 'bodies', 'sheets', 'relations', 'curvature'],
  destinations: () => [...views, 'origin', 'selection'],
};
export const prototypeCommands = { grammars: commandGrammars, providers: fakeProviders };
const same = (a, b) => a.toLowerCase() === b.toLowerCase();
const tokensOf = text => [...text.matchAll(/\S+/g)].map(m => ({ value: m[0], start: m.index, end: m.index + m[0].length }));
const numericDistance = value => /^-?(?:\d+(?:\.\d+)?|\.\d+)(?:mm|cm|m)?$/i.test(value);

export function commandSuggestions(text, caret = text.length, registry = prototypeCommands, context = {}) {
  const tokens = tokensOf(text);
  const indexAtCaret = tokens.findIndex(t => caret <= t.end);
  const activeIndex = indexAtCaret === -1 ? tokens.length : indexAtCaret;
  const verb = tokens[0]?.value ?? '';
  const grammar = registry.grammars.find(g => same(g.verb, verb))
    ?? registry.grammars.find(g => g.verb.startsWith(verb.toLowerCase()));
  const slots = [{ name: 'command', provider: null }, ...(grammar?.parts ?? [])];
  const count = Math.min(slots.length, Math.max(1, tokens.length + (/\s$/.test(text) ? 1 : 0)));
  const args = {};
  const columns = slots.slice(0, count).map((slot, index) => {
    const token = tokens[index]?.value ?? '';
    const values = index === 0 ? registry.grammars.map(g => g.verb)
      : registry.providers[slot.provider]({ grammar, arguments: { ...args }, index, context });
    const exact = values.find(value => same(value, token));
    const custom = slot.provider === 'distances' && numericDistance(token);
    const choices = exact || !token ? values : custom ? [...values, token]
      : values.filter(value => value.toLowerCase().startsWith(token.toLowerCase()));
    const selected = exact ?? (custom ? token : choices[0]) ?? token;
    if (index > 0) args[slot.name] = selected;
    return { ...slot, index, token, choices, selected, valid: choices.length > 0 };
  });
  return { columns, activeIndex: Math.min(activeIndex, slots.length - 1), grammar, tokens };
}

// Five fixed rows; cycling keeps alternatives on both sides without duplicates.
export function columnRows(column) {
  const { choices, selected } = column;
  const center = Math.max(0, choices.indexOf(selected));
  const above = Math.min(2, Math.floor((choices.length - 1) / 2));
  const below = Math.min(2, choices.length - 1 - above);
  return [-2, -1, 0, 1, 2].map(offset => {
    if (!offset) return selected;
    if (offset < -above || offset > below || !choices.length) return null;
    return choices[(center + offset + choices.length) % choices.length];
  });
}

export function replaceCommandPart(text, index, value, advance = false) {
  const tokens = tokensOf(text);
  const token = tokens[index];
  const start = token?.start ?? text.length;
  const end = token?.end ?? text.length;
  // Changing the verb invalidates its previous grammar's arguments.
  const suffix = index === 0 && token && !same(token.value, value) ? '' : text.slice(end);
  const prefix = text.slice(0, start);
  const separator = advance && !/^\s/.test(suffix) ? ' ' : '';
  return {
    text: prefix + value + separator + suffix,
    caret: prefix.length + value.length + (advance ? 1 : 0),
  };
}

export function parseCommand(text, registry = prototypeCommands, context = {}) {
  const tokens = tokensOf(text).map(t => t.value);
  const grammar = registry.grammars.find(g => same(g.verb, tokens[0] ?? ''));
  if (!grammar) return { status: 'unknown', message: `${text.trim() || 'Empty command'} — not implemented` };
  const args = [];
  for (const [index, part] of grammar.parts.entries()) {
    const token = tokens[index + 1];
    if (!token) return { status: 'incomplete', message: `${grammar.verb} — missing ${part.name} · not implemented` };
    const values = registry.providers[part.provider]({ grammar, arguments: Object.fromEntries(args.map(a => [a.name, a.value])), index: index + 1, context });
    const value = values.find(v => same(v, token)) ?? (part.provider === 'distances' && numericDistance(token) ? token : null);
    if (!value) return { status: 'invalid', message: `${grammar.verb} — unknown ${part.name}: ${token} · not implemented` };
    args.push({ name: part.name, value });
  }
  if (tokens.length > grammar.parts.length + 1) return { status: 'invalid', message: `${grammar.verb} — extra text · not implemented` };
  return { status: 'parsed', verb: grammar.verb, arguments: args,
    message: `${grammar.verb} ${args.map(a => a.value).join(' ')} — not implemented` };
}
