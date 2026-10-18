import test from 'node:test';
import assert from 'node:assert/strict';
import { commandSuggestions, columnRows, replaceCommandPart, parseCommand, prototypeCommands } from '../commands.mjs';

test('typing progressively reveals only reached command parts; deletion retracts them', () => {
  for (const [text, names] of [
    ['', ['command']], ['mo', ['command']], ['move ', ['command', 'target']],
    ['move P2 ', ['command', 'target', 'direction']],
    ['move P2 up ', ['command', 'target', 'direction', 'distance']],
    ['move P2 up 32mm ', ['command', 'target', 'direction', 'distance']],
    ['move P2', ['command', 'target']], ['show ', ['command', 'subject']],
  ]) assert.deepEqual(commandSuggestions(text).columns.map(c => c.name), names);
  assert.deepEqual(commandSuggestions('s').columns[0].choices, ['show', 'subtract']);
  assert.equal(commandSuggestions('mo').columns[0].selected, 'move');
});

test('all seven grammars parse ordered, named values without executing anything', () => {
  for (const text of ['connect P1 P2', 'move C2 normal 32mm', 'keep projection front',
    'show curves', 'go origin', 'insert P3 C1', 'subtract Helmet Visor']) {
    const result = parseCommand(text);
    assert.equal(result.status, 'parsed', text);
    assert.equal(result.message, `${text} — not implemented`);
  }
  assert.deepEqual(parseCommand('subtract Helmet Visor').arguments,
    [{ name: 'body', value: 'Helmet' }, { name: 'body', value: 'Visor' }]);
  assert.equal(parseCommand('MOVE p2 UP 12.5mm').message, 'move P2 up 12.5mm — not implemented');
});

test('ordinary, unknown, incomplete, and excess text remains text with honest feedback', () => {
  for (const [text, status] of [['a note about this drawing', 'unknown'], ['', 'unknown'],
    ['move P2', 'incomplete'], ['move P2 sideways 12', 'invalid'],
    ['show curves please', 'invalid'], ['insert P1 missing', 'invalid']]) {
    assert.equal(parseCommand(text).status, status);
    assert.match(parseCommand(text).message, /not implemented/);
  }
  const column = commandSuggestions('show nothing').columns[1];
  assert.equal(column.selected, 'nothing');
  assert.equal(column.valid, false);
});

test('every column places its selected choice in the same central row', () => {
  for (const text of ['', 'move P2 up 32mm', 'insert P3 C1', 'keep projection front', 'show unknown', 's']) {
    for (const column of commandSuggestions(text).columns) {
      const rows = columnRows(column);
      assert.equal(rows.length, 5);
      assert.equal(rows[2], column.selected);
      const visible = rows.filter(Boolean);
      assert.equal(new Set(visible).size, visible.length, 'no duplicated alternatives');
      if (column.choices.length >= 5) assert.ok(rows.every(Boolean), 'two alternatives per side');
    }
  }
});

test('accepting and replacing tokens preserves surrounding text and cursor position', () => {
  assert.deepEqual(replaceCommandPart('mo', 0, 'move', true), { text: 'move ', caret: 5 });
  assert.deepEqual(replaceCommandPart('move ', 1, 'P2', true), { text: 'move P2 ', caret: 8 });
  assert.deepEqual(replaceCommandPart('move P2 up 32mm', 1, 'C1', true), { text: 'move C1 up 32mm', caret: 8 });
  assert.deepEqual(replaceCommandPart('move P2 up 32mm', 0, 'show', true), { text: 'show ', caret: 5 });
  assert.equal(commandSuggestions('move P2 up 32mm', 7).activeIndex, 1);
  assert.equal(commandSuggestions('move P2 up 32mm', 10).activeIndex, 2);
});

test('providers can use prior command arguments and external context without UI changes', () => {
  const registry = {
    grammars: [{ verb: 'link', parts: [{ name: 'source', provider: 'objects' }, { name: 'destination', provider: 'remaining' }] }],
    providers: {
      objects: ({ context }) => context.objects,
      remaining: ({ context, arguments: args }) => context.objects.filter(v => v !== args.source),
    },
  };
  const context = { objects: ['A', 'B', 'C'] };
  const suggestions = commandSuggestions('link B ', 7, registry, context);
  assert.deepEqual(suggestions.columns[2].choices, ['A', 'C']);
  assert.equal(parseCommand('link B C', registry, context).status, 'parsed');
  assert.equal(parseCommand('link B B', registry, context).status, 'invalid');
  assert.equal(prototypeCommands.grammars.length, 7);
});
