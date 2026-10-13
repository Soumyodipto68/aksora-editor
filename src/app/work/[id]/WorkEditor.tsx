"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import WorkEditorHeader from "./components/WorkEditorHeader";
import SuggestionPopup from "./components/SuggestionPopup";
import RichTextToolbar from "./components/RichTextToolbar";
import {
  decodeRichContent,
  encodeRichContent,
} from "./richText";

type WorkEditorProps = {
  workId: string;
  initialTitle: string;
  initialContent: string;
};

type SuggestionRange = {
  start: number;
  end: number;
  source: string;
  displayed: string;
};

type ActiveWord = {
  start: number;
  roman: string;
  converted: string;
};

type PopupPosition = {
  top: number;
  left: number;
};

type PendingConversion = {
  id: number;
  start: number;
  word: string;
  delimiter: string;
  timer: ReturnType<typeof setTimeout> | null;
};

type TextChange = {
  start: number;
  oldEnd: number;
  newEnd: number;
};

const DELIMITERS = /^[ \n,.;?!:]$/;
const SUGGESTION_DEBOUNCE_MS = 60;

function getTextChange(previous: string, next: string): TextChange {
  let start = 0;

  while (
    start < previous.length &&
    start < next.length &&
    previous[start] === next[start]
  ) {
    start++;
  }

  let oldEnd = previous.length;
  let newEnd = next.length;

  while (
    oldEnd > start &&
    newEnd > start &&
    previous[oldEnd - 1] === next[newEnd - 1]
  ) {
    oldEnd--;
    newEnd--;
  }

  return { start, oldEnd, newEnd };
}

type EditorPoint = {
  node: Node;
  offset: number;
};

function getEditorText(editor: HTMLElement) {
  return (editor.innerText || editor.textContent || "").replace(/\r/g, "");
}

function getEditorPoint(editor: HTMLElement, targetOffset: number): EditorPoint | null {
  const walker = document.createTreeWalker(
    editor,
    NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
    {
      acceptNode(node) {
        return node.nodeType === Node.TEXT_NODE ||
          (node.nodeType === Node.ELEMENT_NODE &&
            ["BR", "LI"].includes((node as Element).tagName))
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_SKIP;
      },
    },
  );
  let offset = 0;
  let lastPoint: EditorPoint = { node: editor, offset: editor.childNodes.length };

  while (walker.nextNode()) {
    const node = walker.currentNode;

    if (node.nodeType === Node.TEXT_NODE) {
      const length = node.textContent?.length ?? 0;
      if (targetOffset <= offset + length) {
        return { node, offset: Math.max(0, targetOffset - offset) };
      }
      offset += length;
      lastPoint = { node, offset: length };
      continue;
    }

    const parent = node.parentNode;
    if (!parent) {
      continue;
    }

    const childIndex = Array.prototype.indexOf.call(parent.childNodes, node);
    if (
      (node as Element).tagName === "LI" &&
      (node as Element).previousElementSibling?.tagName === "LI"
    ) {
      if (targetOffset <= offset) {
        return { node: parent, offset: childIndex };
      }
      offset++;
      lastPoint = { node: parent, offset: childIndex };
    }

    if ((node as Element).tagName !== "BR") {
      continue;
    }

    if (targetOffset <= offset) {
      return { node: parent, offset: childIndex };
    }

    offset++;
    lastPoint = { node: parent, offset: childIndex + 1 };
  }

  return lastPoint;
}

function getEditorOffset(editor: HTMLElement, node: Node, nodeOffset: number) {
  const range = document.createRange();
  range.selectNodeContents(editor);
  range.setEnd(node, nodeOffset);
  const fragment = range.cloneContents();
  const temporary = document.createElement("div");
  temporary.appendChild(fragment);
  return Math.min(getEditorText(temporary).length, getEditorText(editor).length);
}

function replaceEditorText(previous: string, next: string, editor: HTMLElement) {
  const change = getTextChange(previous, next);
  const start = getEditorPoint(editor, change.start);
  const end = getEditorPoint(editor, change.oldEnd);

  if (!start || !end) {
    editor.textContent = next;
    return;
  }

  const range = document.createRange();
  range.setStart(start.node, start.offset);
  range.setEnd(end.node, end.offset);
  range.deleteContents();

  const replacement = next.slice(change.start, change.newEnd);
  const fragment = document.createDocumentFragment();
  const lines = replacement.split("\n");

  lines.forEach((line, index) => {
    if (index > 0) {
      fragment.appendChild(document.createElement("br"));
    }
    if (line) {
      fragment.appendChild(document.createTextNode(line));
    }
  });

  range.insertNode(fragment);
}

export default function WorkEditor({
  workId,
  initialTitle,
  initialContent,
}: WorkEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [bengaliTyping, setBengaliTyping] = useState(true);

  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error">(
    "saved",
  );

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionRange, setSuggestionRange] =
    useState<SuggestionRange | null>(null);
  const suggestionRangeRef = useRef<SuggestionRange | null>(null);
  const [activeSuggestion, setActiveSuggestion] = useState(0);

  const [popupPosition, setPopupPosition] = useState<PopupPosition>({
    top: 40,
    left: 24,
  });

  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transliterationTimeout = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const pendingConversionsRef = useRef<PendingConversion[]>([]);
  const nextConversionIdRef = useRef(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const editorBodyRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const pendingSelection = useRef<{ start: number; end: number } | null>(null);
  const contentRef = useRef(initialContent);
  const titleRef = useRef(initialTitle);

  const activeWordRef = useRef<ActiveWord | null>(null);
  const suggestionRequestIdRef = useRef(0);
  const bengaliTypingRef = useRef(true);

  // Tracks words converted during the current editing session.
  const convertedWordsRef = useRef<ActiveWord[]>([]);

  // Cache results and deduplicate simultaneous requests.
  const candidateCache = useRef(new Map<string, string[]>());
  const candidateRequests = useRef(new Map<string, Promise<string[]>>());

  useEffect(() => {
    return () => {
      if (saveTimeout.current) {
        clearTimeout(saveTimeout.current);
      }

      if (transliterationTimeout.current) {
        clearTimeout(transliterationTimeout.current);
      }

      for (const conversion of pendingConversionsRef.current) {
        if (conversion.timer) {
          clearTimeout(conversion.timer);
        }
      }

      pendingConversionsRef.current = [];
    };
  }, []);

  useLayoutEffect(() => {
    if (!pendingSelection.current || !textareaRef.current) {
      return;
    }

    textareaRef.current.setSelectionRange(
      pendingSelection.current.start,
      pendingSelection.current.end,
    );
    setEditorSelection(
      pendingSelection.current.start,
      pendingSelection.current.end,
    );
    pendingSelection.current = null;
  }, [content]);

  useLayoutEffect(() => {
    const editor = editorRef.current;

    if (!editor) {
      return;
    }

    editor.innerHTML = decodeRichContent(initialContent);
    const plainText = getEditorText(editor);
    contentRef.current = plainText;

    if (textareaRef.current) {
      textareaRef.current.value = plainText;
    }

    const serialized = encodeRichContent(editor.innerHTML);
    setContent(serialized);
  }, [initialContent]);

  function clearSuggestions() {
    suggestionRequestIdRef.current++;
    setSuggestions([]);
    setSuggestionsLoading(false);
    suggestionRangeRef.current = null;
    setSuggestionRange(null);
    setActiveSuggestion(0);
  }

  function updateSuggestionRange(range: SuggestionRange | null) {
    suggestionRangeRef.current = range;
    setSuggestionRange(range);
  }

  function scheduleSave(nextTitle: string, nextContent: string) {
    setSaveStatus("saving");

    if (saveTimeout.current) {
      clearTimeout(saveTimeout.current);
    }

    saveTimeout.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/works/${workId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: nextTitle,
            content: nextContent,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to save");
        }

        setSaveStatus("saved");
      } catch (error) {
        console.error(error);
        setSaveStatus("error");
      }
    }, 800);
  }

  function updateContent(value: string, editorAlreadyUpdated = false) {
    if (textareaRef.current) {
      const selectionStart = textareaRef.current.selectionStart;
      const selectionEnd = textareaRef.current.selectionEnd;
      textareaRef.current.value = value;
      textareaRef.current.setSelectionRange(
        Math.min(selectionStart, value.length),
        Math.min(selectionEnd, value.length),
      );
    }

    if (!editorAlreadyUpdated && editorRef.current) {
      replaceEditorText(contentRef.current, value, editorRef.current);
    }

    contentRef.current = value;
    const serialized = editorRef.current
      ? encodeRichContent(editorRef.current.innerHTML)
      : value;
    setContent(serialized);
    scheduleSave(titleRef.current, serialized);
  }

  function handleFormattedChange() {
    const editor = editorRef.current;

    if (!editor) {
      return;
    }

    const value = getEditorText(editor);
    const previous = contentRef.current;

    if (value !== previous) {
      const change = getTextChange(previous, value);
      updatePendingConversionPositions(
        change.start,
        change.oldEnd,
        change.newEnd,
      );
      updateConvertedWordPositions(previous, value);
      activeWordRef.current = null;
      clearSuggestions();
    }

    contentRef.current = value;

    if (textareaRef.current) {
      const { start, end } = getEditorSelection();
      textareaRef.current.value = value;
      textareaRef.current.setSelectionRange(start, end);
    }

    const serialized = encodeRichContent(editor.innerHTML);
    setContent(serialized);
    scheduleSave(titleRef.current, serialized);
  }

  function setEditorSelection(start: number, end: number) {
    const editor = editorRef.current;

    if (!editor) {
      return;
    }

    const startPoint = getEditorPoint(editor, start);
    const endPoint = getEditorPoint(editor, end);

    if (!startPoint || !endPoint) {
      return;
    }

    const range = document.createRange();
    range.setStart(startPoint.node, startPoint.offset);
    range.setEnd(endPoint.node, endPoint.offset);

    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }

  function getEditorSelection() {
    const editor = editorRef.current;
    const selection = window.getSelection();

    if (!editor || !selection?.rangeCount) {
      return { start: contentRef.current.length, end: contentRef.current.length };
    }

    const range = selection.getRangeAt(0);
    if (!editor.contains(range.startContainer) || !editor.contains(range.endContainer)) {
      return { start: contentRef.current.length, end: contentRef.current.length };
    }

    return {
      start: getEditorOffset(editor, range.startContainer, range.startOffset),
      end: getEditorOffset(editor, range.endContainer, range.endOffset),
    };
  }

  function syncEditorSelection() {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    const { start, end } = getEditorSelection();
    textarea.setSelectionRange(start, end);
  }

  function handleEditorSelection() {
    syncEditorSelection();

    if (!suggestionRange || !textareaRef.current) {
      return;
    }

    const { selectionStart, selectionEnd } = textareaRef.current;
    const collapsed = selectionStart === selectionEnd;
    const caretInConvertedWord =
      suggestionRange.source !== suggestionRange.displayed &&
      collapsed &&
      selectionStart >= suggestionRange.start &&
      selectionStart <= suggestionRange.end;
    const caretAtRomanWordEnd =
      suggestionRange.source === suggestionRange.displayed &&
      collapsed &&
      selectionStart === suggestionRange.end;
    const caretAfterDelimiter =
      collapsed &&
      selectionStart === suggestionRange.end + 1 &&
      DELIMITERS.test(contentRef.current[suggestionRange.end] ?? "");

    if (!caretAtRomanWordEnd && !caretInConvertedWord && !caretAfterDelimiter) {
      clearSuggestions();
    }
  }

  function handleEditorInput() {
    const editor = editorRef.current;

    if (!editor) {
      return;
    }

    const value = getEditorText(editor);
    syncEditorSelection();
    handleContentChange(value, true);
  }

  function handleEditorPaste(event: React.ClipboardEvent<HTMLDivElement>) {
    event.preventDefault();
    const selection = window.getSelection();

    if (!selection?.rangeCount) {
      return;
    }

    const text = event.clipboardData.getData("text/plain");
    const range = selection.getRangeAt(0);
    range.deleteContents();

    const fragment = document.createDocumentFragment();
    const lines = text.replace(/\r\n?/g, "\n").split("\n");

    lines.forEach((line, index) => {
      if (index > 0) {
        fragment.appendChild(document.createElement("br"));
      }
      if (line) {
        fragment.appendChild(document.createTextNode(line));
      }
    });

    range.insertNode(fragment);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
    handleEditorInput();
  }

  function handleTitleChange(value: string) {
    titleRef.current = value;
    setTitle(value);
    const serialized = editorRef.current
      ? encodeRichContent(editorRef.current.innerHTML)
      : contentRef.current;
    scheduleSave(value, serialized);
  }

  async function getCandidates(word: string): Promise<string[]> {
    const cacheKey = `bn:${word.toLowerCase()}`;

    const cached = candidateCache.current.get(cacheKey);
    if (cached) {
      return cached;
    }

    const pending = candidateRequests.current.get(cacheKey);
    if (pending) {
      return pending;
    }

    const request = (async () => {
      const response = await fetch("/api/transliterate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          word,
          language: "bn",
        }),
      });

      if (!response.ok) {
        throw new Error("Transliteration request failed");
      }

      const result: {
        candidates?: string[];
        converted?: string;
      } = await response.json();

      const values = [
        ...new Set(
          (result.candidates ?? [result.converted ?? word]).filter(
            (candidate) =>
              typeof candidate === "string" && candidate.length > 0,
          ),
        ),
      ];

      // Keep the original Roman spelling available as an option.
      if (!values.includes(word)) {
        values.push(word);
      }

      candidateCache.current.set(cacheKey, values);
      return values;
    })();

    candidateRequests.current.set(cacheKey, request);

    try {
      return await request;
    } finally {
      candidateRequests.current.delete(cacheKey);
    }
  }

  function recordConvertedWord(
    start: number,
    roman: string,
    converted: string,
  ) {
    const end = start + converted.length;

    convertedWordsRef.current = [
      ...convertedWordsRef.current.filter(
        (word) =>
          word.start + word.converted.length <= start || word.start >= end,
      ),
      {
        start,
        roman,
        converted,
      },
    ].sort((a, b) => a.start - b.start);
  }

  // Keeps tracked word positions aligned with document edits.
  // Words touched by an edit are removed from tracking.
  function updateConvertedWordPositions(previous: string, next: string) {
    const { start, oldEnd, newEnd } = getTextChange(previous, next);
    const delta = newEnd - oldEnd;

    convertedWordsRef.current = convertedWordsRef.current.flatMap((word) => {
      const wordEnd = word.start + word.converted.length;

      if (wordEnd <= start) {
        return [word];
      }

      if (word.start >= oldEnd) {
        return [
          {
            ...word,
            start: word.start + delta,
          },
        ];
      }

      return [];
    });
  }

  function updatePendingConversionPositions(
    start: number,
    oldEnd: number,
    newEnd: number,
  ) {
    const delta = newEnd - oldEnd;

    pendingConversionsRef.current = pendingConversionsRef.current.flatMap(
      (conversion) => {
        const conversionEnd = conversion.start + conversion.word.length + 1;

        if (conversionEnd <= start) {
          return [conversion];
        }

        if (conversion.start >= oldEnd) {
          return [{ ...conversion, start: conversion.start + delta }];
        }

        if (conversion.timer) {
          clearTimeout(conversion.timer);
        }

        return [];
      },
    );
  }

  function rebaseSuggestionRange(
    start: number,
    oldEnd: number,
    newEnd: number,
  ) {
    const range = suggestionRangeRef.current;

    if (!range) {
      return;
    }

    const delta = newEnd - oldEnd;

    if (oldEnd <= range.start) {
      updateSuggestionRange({
        ...range,
        start: range.start + delta,
        end: range.end + delta,
      });
    } else if (start < range.end) {
      clearSuggestions();
    }
  }

  function rebaseActiveWord(start: number, oldEnd: number, newEnd: number) {
    const activeWord = activeWordRef.current;

    if (!activeWord) {
      return;
    }

    const activeWordEnd = activeWord.start + activeWord.converted.length;
    const delta = newEnd - oldEnd;

    if (oldEnd <= activeWord.start) {
      activeWordRef.current = {
        ...activeWord,
        start: activeWord.start + delta,
      };
    } else if (start < activeWordEnd) {
      activeWordRef.current = null;
    }
  }

  // Wait briefly for a pause before asking the model for suggestions.
  // Ignore outdated requests without blocking the editor.
  function scheduleAutomaticTransliteration(value: string) {
    if (transliterationTimeout.current) {
      clearTimeout(transliterationTimeout.current);
      transliterationTimeout.current = null;
    }

    if (!bengaliTypingRef.current) {
      return;
    }

    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    const cursor = textarea.selectionStart;

    // Suggestions apply to the Roman word immediately before the caret,
    // not necessarily the word at the end of the document.
    const beforeCaret = value.slice(0, cursor);
    const match = beforeCaret.match(/[A-Za-z]+$/);

    if (!match || match[0].length < 2) {
      return;
    }

    const word = match[0];
    const start = cursor - word.length;
    const requestId = ++suggestionRequestIdRef.current;

    setSuggestions([]);
    setSuggestionsLoading(true);
    setActiveSuggestion(0);
    updateSuggestionRange({
      start,
      end: cursor,
      source: word,
      displayed: word,
    });

    transliterationTimeout.current = setTimeout(async () => {
      const currentTextarea = textareaRef.current;

      if (
        !currentTextarea ||
        !bengaliTypingRef.current ||
        requestId !== suggestionRequestIdRef.current ||
        contentRef.current !== value ||
        currentTextarea.selectionStart !== cursor ||
        currentTextarea.selectionEnd !== cursor
      ) {
        if (requestId === suggestionRequestIdRef.current) {
          setSuggestionsLoading(false);
        }
        return;
      }

      try {
        const candidates = await getCandidates(word);

        const latestTextarea = textareaRef.current;
        const current = contentRef.current;

        // Discard results if the user has typed, moved the caret,
        // changed modes, or started a newer suggestion request.
        if (
          requestId !== suggestionRequestIdRef.current ||
          !bengaliTypingRef.current ||
          !latestTextarea ||
          current !== value ||
          latestTextarea.selectionStart !== cursor ||
          latestTextarea.selectionEnd !== cursor ||
          current.slice(start, start + word.length) !== word
        ) {
          return;
        }

        const options = [...new Set([...candidates, word])];

        setSuggestions(options);
        setSuggestionsLoading(false);
        setActiveSuggestion(0);

        updateSuggestionRange({
          start,
          end: start + word.length,
          source: word,
          displayed: word,
        });
      } catch (error) {
        console.error("Transliteration suggestions failed:", error);
        if (requestId === suggestionRequestIdRef.current) {
          setSuggestions([word]);
          setSuggestionsLoading(false);
        }
      }
    }, SUGGESTION_DEBOUNCE_MS);
  }

  // Commit completed words independently so rapid typing cannot invalidate
  // earlier words while a transliteration request is in flight.
  function convertWordBeforeDelimiter(value: string, cursor: number) {
    if (!bengaliTypingRef.current || cursor < 2) {
      return;
    }

    const delimiter = value[cursor - 1];

    if (!DELIMITERS.test(delimiter)) {
      return;
    }

    const beforeDelimiter = value.slice(0, cursor - 1);
    const match = beforeDelimiter.match(/[A-Za-z]+$/);

    if (!match) {
      return;
    }

    const word = match[0];
    const start = cursor - 1 - word.length;

    if (start < 0) {
      return;
    }

    const conversion: PendingConversion = {
      id: ++nextConversionIdRef.current,
      start,
      word,
      delimiter,
      timer: null,
    };

    pendingConversionsRef.current.push(conversion);

    void getCandidates(word)
      .then((candidates) => {
          const pendingIndex = pendingConversionsRef.current.findIndex(
            ({ id }) => id === conversion.id,
          );

          if (pendingIndex < 0 || !bengaliTypingRef.current) {
            return;
          }

          const [pending] = pendingConversionsRef.current.splice(
            pendingIndex,
            1,
          );
          const current = contentRef.current;
          const wordEnd = pending.start + pending.word.length;

          if (
            current.slice(pending.start, wordEnd) !== pending.word ||
            current[wordEnd] !== pending.delimiter
          ) {
            return;
          }

          const converted = candidates[0] ?? pending.word;

          if (converted === pending.word) {
            return;
          }

          const nextContent =
            current.slice(0, pending.start) +
            converted +
            current.slice(wordEnd);
          const textarea = textareaRef.current;
          const delta = converted.length - pending.word.length;
          const selectionStart = textarea?.selectionStart ?? cursor;
          const selectionEnd = textarea?.selectionEnd ?? selectionStart;
          const selectionAfterDelimiter =
            selectionStart === wordEnd + 1 &&
            selectionEnd === selectionStart;

          updateConvertedWordPositions(current, nextContent);
          rebaseSuggestionRange(
            pending.start,
            wordEnd,
            pending.start + converted.length,
          );
          rebaseActiveWord(
            pending.start,
            wordEnd,
            pending.start + converted.length,
          );
          updatePendingConversionPositions(
            pending.start,
            wordEnd,
            pending.start + converted.length,
          );
          recordConvertedWord(pending.start, pending.word, converted);

          if (selectionAfterDelimiter) {
            activeWordRef.current = {
              start: pending.start,
              roman: pending.word,
              converted,
            };

            const options = [...new Set([...candidates, pending.word])];

            setSuggestions(options);
            setActiveSuggestion(Math.max(0, options.indexOf(converted)));
            updateSuggestionRange({
              start: pending.start,
              end: pending.start + converted.length,
              source: pending.word,
              displayed: converted,
            });
          }

          const moveSelection = (position: number) => {
            if (position <= pending.start) {
              return position;
            }

            if (position >= wordEnd) {
              return position + delta;
            }

            return pending.start + converted.length;
          };

          if (
            selectionStart > pending.start ||
            selectionEnd > pending.start
          ) {
            pendingSelection.current = {
              start: moveSelection(selectionStart),
              end: moveSelection(selectionEnd),
            };
          }

          updateContent(nextContent);
      })
      .catch((error: unknown) => {
          const pendingIndex = pendingConversionsRef.current.findIndex(
            ({ id }) => id === conversion.id,
          );

          if (pendingIndex >= 0) {
            pendingConversionsRef.current.splice(pendingIndex, 1);
          }
          console.error("Boundary transliteration failed:", error);
      });
  }

  function handleContentChange(value: string, editorAlreadyUpdated = false) {
    const textarea = textareaRef.current;
    const cursor = textarea?.selectionStart ?? value.length;
    const previous = contentRef.current;
    const activeWord = activeWordRef.current;

    if (activeWord) {
      const change = getTextChange(previous, value);
      const convertedEnd = activeWord.start + activeWord.converted.length;
      const insertedText = value.slice(change.start, change.newEnd);

      if (
        change.start === convertedEnd &&
        change.oldEnd === convertedEnd &&
        insertedText.length > 0 &&
        /^[A-Za-z]+$/.test(insertedText)
      ) {
        const restored =
          value.slice(0, activeWord.start) +
          activeWord.roman +
          insertedText +
          value.slice(change.newEnd);
        const restoredCaret =
          change.newEnd + activeWord.roman.length - activeWord.converted.length;

        activeWordRef.current = null;
        clearSuggestions();
        updatePendingConversionPositions(
          change.start,
          change.oldEnd,
          change.newEnd,
        );
        updateConvertedWordPositions(previous, value);
        updateConvertedWordPositions(value, restored);
        pendingSelection.current = {
          start: restoredCaret,
          end: restoredCaret,
        };
        if (editorRef.current) {
          replaceEditorText(value, restored, editorRef.current);
        }
        updateContent(restored, true);
        scheduleAutomaticTransliteration(restored);

        return;
      }

      activeWordRef.current = null;
    }

    if (transliterationTimeout.current) {
      clearTimeout(transliterationTimeout.current);
      transliterationTimeout.current = null;
    }

    suggestionRequestIdRef.current++;
    clearSuggestions();

    const change = getTextChange(previous, value);
    updatePendingConversionPositions(
      change.start,
      change.oldEnd,
      change.newEnd,
    );
    updateConvertedWordPositions(previous, value);
    updateContent(value, editorAlreadyUpdated);

    // Only an inserted delimiter commits a word; deleting or editing one
    // must not trigger a conversion.
    if (
      cursor > 0 &&
      DELIMITERS.test(value[cursor - 1]) &&
      value.length > previous.length
    ) {
      convertWordBeforeDelimiter(value, cursor);
    }

    scheduleAutomaticTransliteration(value);
  }

  function chooseSuggestion(candidate: string) {
    if (!suggestionRange) {
      return;
    }

    const { start, end, source, displayed } = suggestionRange;
    const current = contentRef.current;

    // Only replace the exact word this popup belongs to.
    if (current.slice(start, end) !== displayed) {
      clearSuggestions();
      return;
    }

    const nextContent =
      current.slice(0, start) + candidate + current.slice(end);
    const change = getTextChange(current, nextContent);

    updatePendingConversionPositions(
      change.start,
      change.oldEnd,
      change.newEnd,
    );
    updateConvertedWordPositions(current, nextContent);

    if (candidate !== source) {
      recordConvertedWord(start, source, candidate);
    }

    activeWordRef.current =
      candidate !== source && start + displayed.length === current.length
        ? {
            start,
            roman: source,
            converted: candidate,
          }
        : null;

    if (transliterationTimeout.current) {
      clearTimeout(transliterationTimeout.current);
      transliterationTimeout.current = null;
    }

    clearSuggestions();

    pendingSelection.current = {
      start: start + candidate.length,
      end: start + candidate.length,
    };
    updateContent(nextContent);
    editorRef.current?.focus();
  }

  // Click a converted word to reopen its alternatives.
  async function handleEditorClick() {
    if (!bengaliTypingRef.current) {
      return;
    }

    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    const caret = textarea.selectionStart;

    const word = convertedWordsRef.current.find(
      (item) =>
        caret >= item.start && caret <= item.start + item.converted.length,
    );

    if (!word) {
      clearSuggestions();
      return;
    }

    const requestId = ++suggestionRequestIdRef.current;
    const expectedText = word.converted;

    try {
      const candidates = await getCandidates(word.roman);
      const current = contentRef.current;

      // The text may have changed while candidates were loading.
      if (
        requestId !== suggestionRequestIdRef.current ||
        !bengaliTypingRef.current ||
        current.slice(word.start, word.start + expectedText.length) !==
          expectedText
      ) {
        return;
      }

      const options = [...new Set([...candidates, word.roman])];

      setSuggestions(options);

      updateSuggestionRange({
        start: word.start,
        end: word.start + expectedText.length,
        source: word.roman,
        displayed: expectedText,
      });

      const currentIndex = options.indexOf(expectedText);

      setActiveSuggestion(currentIndex >= 0 ? currentIndex : 0);
    } catch (error) {
      console.error("Could not load word suggestions:", error);
    }
  }

  function handleContentKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    // Space commits the selected suggestion and inserts a space.
    if (
      DELIMITERS.test(event.key) &&
      suggestions.length > 0 &&
      suggestionRange
    ) {
      const textarea = textareaRef.current;
      const { start, end, displayed, source } = suggestionRange;
      const current = contentRef.current;

      if (
        textarea &&
        textarea.selectionStart === end &&
        textarea.selectionEnd === end &&
        current.slice(start, end) === displayed
      ) {
        event.preventDefault();

        const candidate = suggestions[activeSuggestion] ?? suggestions[0];

        const nextContent =
          current.slice(0, start) +
          candidate +
          event.key +
          current.slice(end);

        if (transliterationTimeout.current) {
          clearTimeout(transliterationTimeout.current);
          transliterationTimeout.current = null;
        }

        const change = getTextChange(current, nextContent);
        updatePendingConversionPositions(
          change.start,
          change.oldEnd,
          change.newEnd,
        );
        updateConvertedWordPositions(current, nextContent);

        if (candidate !== source) {
          recordConvertedWord(start, source, candidate);
        }

        activeWordRef.current = null;
        pendingSelection.current = {
          start: start + candidate.length + event.key.length,
          end: start + candidate.length + event.key.length,
        };

        clearSuggestions();
        updateContent(nextContent);

        return;
      }
    }

    if (!suggestions.length || !suggestionRange) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();

      setActiveSuggestion((current) => (current + 1) % suggestions.length);

      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();

      setActiveSuggestion(
        (current) => (current - 1 + suggestions.length) % suggestions.length,
      );

      return;
    }

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();

      chooseSuggestion(suggestions[activeSuggestion] ?? suggestions[0]);

      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      clearSuggestions();
      return;
    }

    if (event.key === "Enter" && !event.shiftKey) {
      const selection = window.getSelection();
      const anchor =
        selection?.anchorNode?.nodeType === Node.ELEMENT_NODE
          ? (selection.anchorNode as Element)
          : selection?.anchorNode?.parentElement;

      if (!anchor?.closest("li")) {
        event.preventDefault();
        document.execCommand("insertLineBreak");
      }
    }
  }

  function toggleBengaliTyping() {
    const nextValue = !bengaliTyping;

    bengaliTypingRef.current = nextValue;
    setBengaliTyping(nextValue);

    if (transliterationTimeout.current) {
      clearTimeout(transliterationTimeout.current);
      transliterationTimeout.current = null;
    }

    suggestionRequestIdRef.current++;
    for (const conversion of pendingConversionsRef.current) {
      if (conversion.timer) {
        clearTimeout(conversion.timer);
      }
    }

    pendingConversionsRef.current = [];
    activeWordRef.current = null;

    clearSuggestions();
  }

  const updatePopupPosition = useCallback(() => {
    const editor = editorRef.current;
    const wrapper = editorBodyRef.current;

    if (!editor || !wrapper || !suggestionRange) {
      return;
    }

    const caret = textareaRef.current?.selectionStart ?? contentRef.current.length;
    const textBeforeCaret = contentRef.current.slice(0, caret);

    const editorRect = editor.getBoundingClientRect();
    const wrapperRect = wrapper.getBoundingClientRect();
    const selection = window.getSelection();
    const selectionRange = selection?.rangeCount
      ? selection.getRangeAt(0)
      : null;
    let markerRect =
      selectionRange?.collapsed &&
      editor.contains(selectionRange.startContainer)
        ? selectionRange.getBoundingClientRect()
        : null;

    if (!markerRect || (!markerRect.width && !markerRect.height)) {
      const computed = window.getComputedStyle(editor);
      const mirror = document.createElement("div");

      const properties = [
        "boxSizing",
        "width",
        "fontFamily",
        "fontSize",
        "fontWeight",
        "fontStyle",
        "letterSpacing",
        "lineHeight",
        "textAlign",
        "textIndent",
        "textTransform",
        "padding",
        "border",
        "whiteSpace",
        "overflowWrap",
        "wordBreak",
        "tabSize",
      ] as const;

      for (const property of properties) {
        mirror.style[property] = computed[property];
      }

      mirror.style.position = "fixed";
      mirror.style.left = `${editorRect.left}px`;
      mirror.style.top = `${editorRect.top}px`;
      mirror.style.height = "auto";
      mirror.style.minHeight = "0";
      mirror.style.maxHeight = "none";
      mirror.style.overflow = "hidden";
      mirror.style.visibility = "hidden";
      mirror.style.pointerEvents = "none";

      const textNode = document.createTextNode(textBeforeCaret);
      const marker = document.createElement("span");

      marker.textContent = "\u200b";

      mirror.appendChild(textNode);
      mirror.appendChild(marker);
      document.body.appendChild(mirror);
      markerRect = marker.getBoundingClientRect();
      document.body.removeChild(mirror);
    }

    const popupHeight = popupRef.current?.offsetHeight ?? 150;
    const popupWidth = popupRef.current?.offsetWidth ?? 280;

    const padding = 8;
    const gap = 4;

    let top = markerRect.bottom - wrapperRect.top + gap;

    if (top + popupHeight > wrapper.clientHeight - padding) {
      top = markerRect.top - wrapperRect.top - popupHeight - gap;
    }

    top = Math.max(
      padding,
      Math.min(
        top,
        Math.max(padding, wrapper.clientHeight - popupHeight - padding),
      ),
    );

    let left = markerRect.left - wrapperRect.left;

    left = Math.max(
      padding,
      Math.min(
        left,
        Math.max(padding, wrapper.clientWidth - popupWidth - padding),
      ),
    );

    setPopupPosition({ top, left });
  }, [suggestionRange]);

  useLayoutEffect(() => {
    if ((!suggestions.length && !suggestionsLoading) || !suggestionRange) {
      return;
    }

    updatePopupPosition();

    window.addEventListener("resize", updatePopupPosition);
    window.addEventListener("scroll", updatePopupPosition, true);

    return () => {
      window.removeEventListener("resize", updatePopupPosition);
      window.removeEventListener("scroll", updatePopupPosition, true);
    };
  }, [
    suggestions,
    suggestionsLoading,
    suggestionRange,
    content,
    activeSuggestion,
    updatePopupPosition,
  ]);

  useEffect(() => {
    const activeItem = popupRef.current?.querySelector<HTMLElement>(
      '[data-active="true"]',
    );

    activeItem?.scrollIntoView({ block: "nearest" });
  }, [activeSuggestion, suggestions]);

  return (
    <>
      <div className="brand-accent-rule mb-4 h-1 w-16 rounded-full" />
      <WorkEditorHeader
        title={title}
        content={content}
        onTitleChange={handleTitleChange}
        bengaliTyping={bengaliTyping}
        onToggleBengaliTyping={toggleBengaliTyping}
        saveStatus={saveStatus}
      />
      <div className="brand-editor mt-8 overflow-visible rounded-xl border border-[#383838] bg-[#1e1e1e]">
        <div ref={editorBodyRef} className="relative">
          <RichTextToolbar
            editorRef={editorRef}
            onFormat={handleFormattedChange}
          />
          <SuggestionPopup
            suggestions={suggestions}
            isLoading={suggestionsLoading}
            suggestionRange={suggestionRange}
            activeSuggestion={activeSuggestion}
            popupPosition={popupPosition}
            popupRef={popupRef}
            onActiveSuggestionChange={setActiveSuggestion}
            onChooseSuggestion={chooseSuggestion}
          />

          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            role="textbox"
            aria-label="Document content"
            aria-multiline="true"
            onInput={handleEditorInput}
            onPaste={handleEditorPaste}
            onDrop={(event) => event.preventDefault()}
            onKeyDown={(event) => {
              syncEditorSelection();
              handleContentKeyDown(event);
            }}
            onClick={() => {
              handleEditorSelection();
              void handleEditorClick();
            }}
            onKeyUp={handleEditorSelection}
            onMouseUp={handleEditorSelection}
            onScroll={updatePopupPosition}
            data-placeholder="Start writing..."
            className="rich-text-editor min-h-[650px] w-full whitespace-pre-wrap break-words bg-transparent p-6 text-base leading-8 text-[#d4d4d4] outline-none"
          />
          <textarea
            ref={textareaRef}
            aria-hidden="true"
            tabIndex={-1}
            defaultValue={initialContent}
            className="pointer-events-none absolute h-px w-px resize-none opacity-0"
          />
        </div>
      </div>
    </>
  );
}
