"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

type RichTextToolbarProps = {
  editorRef: RefObject<HTMLDivElement | null>;
  onFormat: () => void;
};

type ToolbarState = {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikeThrough: boolean;
  justifyLeft: boolean;
  justifyCenter: boolean;
  justifyRight: boolean;
  justifyFull: boolean;
  insertUnorderedList: boolean;
  insertOrderedList: boolean;
};

const commands: (keyof ToolbarState)[] = [
  "bold",
  "italic",
  "underline",
  "strikeThrough",
  "justifyLeft",
  "justifyCenter",
  "justifyRight",
  "justifyFull",
  "insertUnorderedList",
  "insertOrderedList",
];

const initialState: ToolbarState = {
  bold: false,
  italic: false,
  underline: false,
  strikeThrough: false,
  justifyLeft: false,
  justifyCenter: false,
  justifyRight: false,
  justifyFull: false,
  insertUnorderedList: false,
  insertOrderedList: false,
};

const buttonClass =
  "inline-flex h-8 min-w-8 items-center justify-center rounded px-2 text-sm text-zinc-300 transition hover:bg-zinc-700 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500";
const activeButtonClass = "bg-sky-900/70 text-sky-100 ring-1 ring-sky-600/60";

export default function RichTextToolbar({
  editorRef,
  onFormat,
}: RichTextToolbarProps) {
  const savedSelection = useRef<Range | null>(null);
  const [active, setActive] = useState(initialState);

  const syncActiveState = useCallback(() => {
    const editor = editorRef.current;
    const selection = window.getSelection();

    if (
      !editor ||
      !selection?.rangeCount ||
      !editor.contains(selection.getRangeAt(0).commonAncestorContainer)
    ) {
      setActive(initialState);
      return;
    }

    const nextState = { ...initialState };

    for (const command of commands) {
      nextState[command] = document.queryCommandState(command);
    }

    setActive(nextState);
  }, [editorRef]);

  useEffect(() => {
    const editor = editorRef.current;

    document.addEventListener("selectionchange", syncActiveState);
    editor?.addEventListener("keyup", syncActiveState);
    editor?.addEventListener("mouseup", syncActiveState);
    editor?.addEventListener("input", syncActiveState);

    return () => {
      document.removeEventListener("selectionchange", syncActiveState);
      editor?.removeEventListener("keyup", syncActiveState);
      editor?.removeEventListener("mouseup", syncActiveState);
      editor?.removeEventListener("input", syncActiveState);
    };
  }, [editorRef, syncActiveState]);

  function restoreSelection() {
    const editor = editorRef.current;
    const range = savedSelection.current;

    if (!editor || !range) {
      editor?.focus();
      return;
    }

    editor.focus();
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }

  function runCommand(command: string, value?: string) {
    restoreSelection();
    document.execCommand(command, false, value);
    syncActiveState();
    onFormat();
  }

  function applyFontSize(size: string) {
    restoreSelection();
    document.execCommand("fontSize", false, "7");

    editorRef.current?.querySelectorAll("font[size='7']").forEach((font) => {
      const span = document.createElement("span");
      span.style.fontSize = size;
      span.innerHTML = font.innerHTML;
      font.replaceWith(span);
    });

    syncActiveState();
    onFormat();
  }

  function handleToolbarMouseDown(event: React.MouseEvent<HTMLDivElement>) {
    const selection = window.getSelection();
    const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
    savedSelection.current =
      range && editorRef.current?.contains(range.commonAncestorContainer)
        ? range.cloneRange()
        : null;

    if ((event.target as HTMLElement).closest("button")) {
      event.preventDefault();
    }
  }

  function formatButton(command: keyof ToolbarState, label: string, content: React.ReactNode, extraClass = "") {
    return (
      <button
        type="button"
        aria-label={label}
        aria-pressed={active[command]}
        title={label}
        className={`${buttonClass} ${active[command] ? activeButtonClass : ""} ${extraClass}`}
        onClick={() => runCommand(command)}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      role="toolbar"
      aria-label="Text formatting"
      onMouseDown={handleToolbarMouseDown}
      className="flex flex-wrap items-center gap-1 border-b border-zinc-700/80 px-3 py-2"
    >
      {formatButton("bold", "Bold", <strong>B</strong>)}
      {formatButton("italic", "Italic", <em>I</em>)}
      {formatButton("underline", "Underline", "U", "underline")}
      {formatButton("strikeThrough", "Strikethrough", "S", "line-through")}

      <span aria-hidden="true" className="mx-1 h-5 w-px bg-zinc-700" />

      <label className="sr-only" htmlFor="editor-font-size">Font size</label>
      <select
        id="editor-font-size"
        defaultValue="16px"
        onChange={(event) => applyFontSize(event.target.value)}
        className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200 outline-none focus:border-sky-500"
      >
        <option value="12px">12</option>
        <option value="14px">14</option>
        <option value="16px">16</option>
        <option value="18px">18</option>
        <option value="24px">24</option>
        <option value="32px">32</option>
      </select>

      {formatButton("justifyLeft", "Align left", "≡")}
      {formatButton("justifyCenter", "Align center", "☰")}
      {formatButton("justifyRight", "Align right", "≡")}
      {formatButton("justifyFull", "Justify text", "☰")}

      {formatButton("insertUnorderedList", "Bulleted list", "•≡")}
      {formatButton("insertOrderedList", "Numbered list", "1.")}

      <label className="flex h-8 items-center gap-1 rounded px-2 text-xs text-zinc-400 hover:bg-zinc-700" title="Text color">
        A
        <input
          aria-label="Text color"
          type="color"
          defaultValue="#d4d4d4"
          onChange={(event) => runCommand("foreColor", event.target.value)}
          className="h-5 w-5 cursor-pointer border-0 bg-transparent p-0"
        />
      </label>
      <span aria-hidden="true" className="mx-1 h-5 w-px bg-zinc-700" />
      <button type="button" aria-label="Undo" title="Undo" className={buttonClass} onClick={() => runCommand("undo")}>
        ↶
      </button>
      <button type="button" aria-label="Redo" title="Redo" className={buttonClass} onClick={() => runCommand("redo")}>
        ↷
      </button>
    </div>
  );
}
