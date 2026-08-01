"use client";

import { useEffect, useImperativeHandle, useRef, type Ref } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import { Extension } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node as PMNode } from "@tiptap/pm/model";
import { docToPlainText, pmRangeToTextRange, textRangeToPmRange } from "@/lib/editor-text";
import { normalize, resolveSentenceScores, type WinstonSentenceScore } from "@/lib/winston-sentences";
import type { ProvenanceMap, ProvenanceSource } from "@/lib/provenance";
import { EditorRibbon } from "@/components/editor-ribbon";

/*
  Score highlighting is a ProseMirror DECORATION, not markup in the document.
  Decorations are positioned in document coordinates and re-mapped by
  ProseMirror on every edit, so they cannot drift away from the text they
  describe. That is the whole reason this replaced the previous
  mirrored-textarea overlay, where highlight styling changed the mirror's
  layout and pushed the visible glyphs out of sync with the real caret.
*/
const highlightKey = new PluginKey<HighlightState>("scoreHighlight");

interface HighlightState {
  sentences: WinstonSentenceScore[] | null;
  provenance: ProvenanceMap | null;
  decorations: DecorationSet;
}

/*
  An "estimated" sentence (no matching Winston score yet, see
  resolveSentenceScores) is never colored by the heuristic's guessed verdict:
  that heuristic is known to be unreliable, so a fresh AI rewrite or hand edit
  showing up green ("looks good") before it's ever been verified is actively
  misleading. Unverified text is colored by WHO WROTE IT instead: an accepted
  AI suggestion (or "rewrite entire draft") vs. the user's own typing.
*/
function buildDecorations(
  doc: PMNode,
  winston: WinstonSentenceScore[] | null,
  provenance: ProvenanceMap | null
): DecorationSet {
  const { text, segments } = docToPlainText(doc);
  if (!text.trim()) return DecorationSet.empty;

  const decorations: Decoration[] = [];
  for (const s of resolveSentenceScores(text, winston)) {
    const { from, to } = textRangeToPmRange(segments, s.start, s.end);
    // An empty or inverted range is not a valid decoration.
    if (to <= from || to > doc.content.size + 1) continue;

    if (s.source === "estimated") {
      const origin = provenance?.get(normalize(s.text)) ?? "user";
      decorations.push(
        Decoration.inline(from, to, {
          class: `score-mark score-estimated score-provenance-${origin}`,
          title: origin === "ai" ? "AI rewrite, not yet scanned" : "Your edit, not yet scanned",
        })
      );
      continue;
    }

    decorations.push(
      Decoration.inline(from, to, {
        class: `score-mark score-${s.verdict}`,
        title: `${s.score}/100 human, verified${s.reasons.length ? ` · ${s.reasons.join("; ")}` : ""}`,
      })
    );
  }
  return DecorationSet.create(doc, decorations);
}

const ScoreHighlight = Extension.create<{
  sentences: WinstonSentenceScore[] | null;
  provenance: ProvenanceMap | null;
}>({
  name: "scoreHighlight",
  addOptions: () => ({ sentences: null, provenance: null }),
  addProseMirrorPlugins() {
    const initialSentences = this.options.sentences;
    const initialProvenance = this.options.provenance;
    return [
      new Plugin<HighlightState>({
        key: highlightKey,
        state: {
          init: (_config, state) => ({
            sentences: initialSentences,
            provenance: initialProvenance,
            decorations: buildDecorations(state.doc, initialSentences, initialProvenance),
          }),
          apply(tr, value, _oldState, newState) {
            const meta = tr.getMeta(highlightKey) as
              | { sentences: WinstonSentenceScore[] | null; provenance: ProvenanceMap | null }
              | undefined;
            if (!meta && !tr.docChanged) return value;
            const sentences = meta ? meta.sentences : value.sentences;
            const provenance = meta ? meta.provenance : value.provenance;
            return { sentences, provenance, decorations: buildDecorations(newState.doc, sentences, provenance) };
          },
        },
        props: {
          decorations: (state) => highlightKey.getState(state)?.decorations,
        },
      }),
    ];
  },
});

/** Imperative surface the editor exposes, so the page never touches
 *  ProseMirror positions itself. */
export interface RichEditorHandle {
  getText(): string;
  getDoc(): object;
  /** Current selection as plain-text offsets, or null if nothing is selected. */
  getSelectionTextRange(): { start: number; end: number } | null;
  /** `origin: "ai"` records the replacement as an AI rewrite for provenance
   *  highlighting and the post-rescan report; omitted (defaults to "user")
   *  for anything driven by the user's own action. */
  replaceTextRange(start: number, end: number, replacement: string, opts?: { origin?: ProvenanceSource }): void;
  replaceAll(text: string, opts?: { origin?: ProvenanceSource }): void;
  focus(): void;
}

export function RichEditor({
  initialDoc,
  initialText,
  winstonSentences,
  provenance,
  onChange,
  onSelectionChange,
  handleRef,
}: {
  initialDoc: object | null;
  initialText: string;
  winstonSentences: WinstonSentenceScore[] | null;
  provenance: ProvenanceMap | null;
  onChange: (next: { text: string; doc: object; origin: ProvenanceSource }) => void;
  onSelectionChange?: () => void;
  handleRef: Ref<RichEditorHandle>;
}) {
  /*
    The editor is created once and never torn down, so its option callbacks
    would otherwise close over the first render's props and silently stop
    propagating edits. Reading through refs keeps them current without
    recreating the editor (which would lose cursor position and undo history).
  */
  const onChangeRef = useRef(onChange);
  const onSelectionChangeRef = useRef(onSelectionChange);
  useEffect(() => {
    onChangeRef.current = onChange;
    onSelectionChangeRef.current = onSelectionChange;
  });

  // Set right before an imperative replace driven by our own code (accepting
  // a suggestion, "rewrite entire draft"); read once by the very next
  // onUpdate (dispatched synchronously by that same call) and reset, so
  // ordinary typing - which never touches this ref - always reports "user".
  const pendingOriginRef = useRef<ProvenanceSource>("user");

  const editor = useEditor({
    extensions: [StarterKit, ScoreHighlight.configure({ sentences: winstonSentences, provenance })],
    content: initialDoc ?? textToDoc(initialText),
    // Next.js renders this on the server first; without this React throws a
    // hydration mismatch.
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "prose-editor min-h-[280px] max-h-[55vh] overflow-y-auto p-4 outline-none",
      },
    },
    onUpdate: ({ editor: e }) => {
      const origin = pendingOriginRef.current;
      pendingOriginRef.current = "user";
      onChangeRef.current({ text: docToPlainText(e.state.doc).text, doc: e.getJSON(), origin });
    },
    onSelectionUpdate: () => onSelectionChangeRef.current?.(),
  });

  // Winston scores arrive after a rescan and provenance changes on every
  // edit, so push both into the plugin rather than rebuilding the editor
  // (which would lose cursor and undo history).
  useEffect(() => {
    if (!editor) return;
    editor.view.dispatch(editor.state.tr.setMeta(highlightKey, { sentences: winstonSentences, provenance }));
  }, [editor, winstonSentences, provenance]);

  useImperativeHandle(
    handleRef,
    (): RichEditorHandle => ({
      getText: () => (editor ? docToPlainText(editor.state.doc).text : ""),
      getDoc: () => (editor ? editor.getJSON() : {}),
      getSelectionTextRange: () => {
        if (!editor) return null;
        const { from, to } = editor.state.selection;
        if (from === to) return null;
        const { segments } = docToPlainText(editor.state.doc);
        return pmRangeToTextRange(segments, from, to);
      },
      replaceTextRange: (start, end, replacement, opts) => {
        if (!editor) return;
        pendingOriginRef.current = opts?.origin ?? "user";
        const { segments } = docToPlainText(editor.state.doc);
        const { from, to } = textRangeToPmRange(segments, start, end);
        editor.chain().focus().insertContentAt({ from, to }, replacement).run();
      },
      replaceAll: (text, opts) => {
        pendingOriginRef.current = opts?.origin ?? "user";
        editor?.chain().focus().setContent(textToDoc(text)).run();
      },
      focus: () => editor?.chain().focus().run(),
    }),
    [editor]
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <EditorRibbon editor={editor} />
      <EditorContent editor={editor} className="min-h-0 flex-1" />
    </div>
  );
}

/** Plain text into a paragraph-per-blank-line document, matching how
 *  docToPlainText projects one back out. */
function textToDoc(text: string): object {
  const blocks = text.split(/\n{2,}/);
  return {
    type: "doc",
    content: blocks.map((block) => ({
      type: "paragraph",
      ...(block.trim()
        ? { content: [{ type: "text", text: block.replace(/\n/g, " ") }] }
        : {}),
    })),
  };
}

export type { Editor };
