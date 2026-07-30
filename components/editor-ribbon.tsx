"use client";

import {
  ArrowClockwiseIcon,
  ArrowCounterClockwiseIcon,
  ListBulletsIcon,
  ListNumbersIcon,
  QuotesIcon,
  TextBIcon,
  TextHOneIcon,
  TextHTwoIcon,
  TextItalicIcon,
  TextStrikethroughIcon,
} from "@phosphor-icons/react";
import type { Editor } from "@tiptap/react";

/*
  Hand-built rather than using TipTap's prebuilt UI components: this project
  standardises on Phosphor icons, the cobalt accent, and its own radius scale
  (see CLAUDE.md), and the prebuilt components are also the part of TipTap still
  catching up to React 19.
*/
interface Action {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; weight?: "bold" | "regular" }>;
  run: (editor: Editor) => void;
  isActive?: (editor: Editor) => boolean;
  isDisabled?: (editor: Editor) => boolean;
}

const GROUPS: Action[][] = [
  [
    {
      id: "bold",
      label: "Bold",
      icon: TextBIcon,
      run: (e) => e.chain().focus().toggleBold().run(),
      isActive: (e) => e.isActive("bold"),
    },
    {
      id: "italic",
      label: "Italic",
      icon: TextItalicIcon,
      run: (e) => e.chain().focus().toggleItalic().run(),
      isActive: (e) => e.isActive("italic"),
    },
    {
      id: "strike",
      label: "Strikethrough",
      icon: TextStrikethroughIcon,
      run: (e) => e.chain().focus().toggleStrike().run(),
      isActive: (e) => e.isActive("strike"),
    },
  ],
  [
    {
      id: "h2",
      label: "Heading",
      icon: TextHOneIcon,
      run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
      isActive: (e) => e.isActive("heading", { level: 2 }),
    },
    {
      id: "h3",
      label: "Subheading",
      icon: TextHTwoIcon,
      run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),
      isActive: (e) => e.isActive("heading", { level: 3 }),
    },
  ],
  [
    {
      id: "bullet",
      label: "Bullet list",
      icon: ListBulletsIcon,
      run: (e) => e.chain().focus().toggleBulletList().run(),
      isActive: (e) => e.isActive("bulletList"),
    },
    {
      id: "ordered",
      label: "Numbered list",
      icon: ListNumbersIcon,
      run: (e) => e.chain().focus().toggleOrderedList().run(),
      isActive: (e) => e.isActive("orderedList"),
    },
    {
      id: "quote",
      label: "Quote",
      icon: QuotesIcon,
      run: (e) => e.chain().focus().toggleBlockquote().run(),
      isActive: (e) => e.isActive("blockquote"),
    },
  ],
  [
    {
      id: "undo",
      label: "Undo",
      icon: ArrowCounterClockwiseIcon,
      run: (e) => e.chain().focus().undo().run(),
      isDisabled: (e) => !e.can().undo(),
    },
    {
      id: "redo",
      label: "Redo",
      icon: ArrowClockwiseIcon,
      run: (e) => e.chain().focus().redo().run(),
      isDisabled: (e) => !e.can().redo(),
    },
  ],
];

export function EditorRibbon({ editor }: { editor: Editor | null }) {
  if (!editor) {
    // Reserve the row's height so the editor doesn't jump when it mounts.
    return <div className="h-[41px] border-b border-line" aria-hidden />;
  }

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-line px-2 py-1.5">
      {GROUPS.map((group, i) => (
        <div key={group[0].id} className="flex items-center gap-0.5">
          {i > 0 && <span className="mx-1 h-4 w-px bg-line" aria-hidden />}
          {group.map((action) => {
            const active = action.isActive?.(editor) ?? false;
            const disabled = action.isDisabled?.(editor) ?? false;
            return (
              <button
                key={action.id}
                type="button"
                title={action.label}
                aria-label={action.label}
                aria-pressed={active}
                disabled={disabled}
                onClick={() => action.run(editor)}
                className={`inline-flex size-7 items-center justify-center rounded-[10px] transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
                  active ? "bg-accent-soft text-accent" : "text-muted hover:bg-surface hover:text-ink"
                }`}
              >
                <action.icon size={15} weight="bold" />
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
