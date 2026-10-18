import { useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { columnRows, commandSuggestions, parseCommand, prototypeCommands, replaceCommandPart } from './commands.mjs';

export default function CommandBar({ registry = prototypeCommands, context }) {
  const [text, setText] = useState('');
  const [caret, setCaret] = useState(0);
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState('');
  const input = useRef(null);
  const activeColumn = useRef(null);
  const { columns, activeIndex } = commandSuggestions(text, caret, registry, context);
  const active = columns[activeIndex];

  useLayoutEffect(() => {
    activeColumn.current?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [text, caret, open]);

  function choose(column, value, advance = false) {
    const next = replaceCommandPart(text, column.index, value, advance);
    // Commit replacement before positioning the caret, including when only the
    // caret changes. The next keyboard event must see the next command part.
    flushSync(() => {
      setText(next.text);
      setCaret(next.caret);
      setResult('');
      setOpen(true);
    });
    input.current.focus();
    input.current.setSelectionRange(next.caret, next.caret);
  }

  function onKeyDown(event) {
    if (event.nativeEvent.isComposing) return;
    // Read the live caret: selection events can follow a rapid Tab/key sequence.
    const keyCaret = event.currentTarget.selectionStart;
    const keyState = commandSuggestions(text, keyCaret, registry, context);
    const keyColumn = keyState.columns[keyState.activeIndex];
    if (event.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      setResult(parseCommand(text, registry, context).message);
      setOpen(false);
      return;
    }
    if ((event.key === 'ArrowUp' || event.key === 'ArrowDown') && keyColumn?.choices.length) {
      event.preventDefault();
      const offset = event.key === 'ArrowDown' ? 1 : -1;
      const index = keyColumn.choices.indexOf(keyColumn.selected);
      choose(keyColumn, keyColumn.choices[(index + offset + keyColumn.choices.length) % keyColumn.choices.length]);
    } else if ((event.key === 'Tab' && !event.shiftKey || event.key === ' ') && open && keyColumn?.valid
      && input.current.selectionStart === input.current.selectionEnd
      && keyCaret === (keyState.tokens[keyState.activeIndex]?.end ?? text.length)) {
      event.preventDefault();
      choose(keyColumn, keyColumn.selected, true);
    }
  }

  return (
    <div className="command-area" onBlur={event => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }}>
      {open && <div className="command-completion" id="command-completion" aria-label="Command sentence suggestions">
        <div className="command-columns">
          {columns.map(column => <div
            className={`command-column${column.index === activeIndex ? ' current' : ''}`}
            key={column.index}
            ref={column.index === activeIndex ? activeColumn : null}
            role="listbox" aria-label={column.name}
          >
            <span className="command-part-name">{column.name}</span>
            {columnRows(column).map((value, row) => <div
              key={row}
              id={`command-choice-${column.index}-${row}`}
              className={`command-choice${row === 2 ? ' chosen' : ''}${!column.valid ? ' unresolved' : ''}${column.index === 0 ? ' verb' : ''}`}
              role={value ? 'option' : undefined}
              aria-selected={value ? row === 2 : undefined}
              aria-hidden={!value || undefined}
              onPointerDown={value && column.valid ? event => {
                event.preventDefault();
                choose(column, value);
              } : undefined}
            >{value || '\u00a0'}</div>)}
          </div>)}
        </div>
        <div className="command-guidance">↑ ↓ choose · space / tab next <span>prototype · sample values</span></div>
      </div>}
      {!open && result && <output className="command-result" aria-live="polite">{result}</output>}
      <div className="command-line">
        <label htmlFor="command" aria-label="Command">›</label>
        <input ref={input} id="command" type="text" aria-label="Command line"
          autoComplete="off" autoCapitalize="off" spellCheck={false}
          placeholder="Type a command…" value={text}
          aria-expanded={open} aria-controls="command-completion"
          role="combobox" aria-autocomplete="list"
          aria-activedescendant={open && active?.selected ? `command-choice-${activeIndex}-2` : undefined}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onChange={event => {
            setText(event.target.value);
            setCaret(event.target.selectionStart);
            setOpen(true);
            setResult('');
          }}
          onSelect={event => setCaret(event.target.selectionStart)}
          onKeyDown={onKeyDown}
        />
      </div>
    </div>
  );
}
