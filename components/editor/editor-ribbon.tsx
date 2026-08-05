"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowClockwiseIcon,
  ArrowCounterClockwiseIcon,
  CheckSquareIcon,
  CodeBlockIcon,
  LinkSimpleIcon,
  ListBulletsIcon,
  ListNumbersIcon,
  QuotesIcon,
  TextAlignCenterIcon,
  TextAlignLeftIcon,
  TextAlignRightIcon,
  TextBIcon,
  TextHOneIcon,
  TextHThreeIcon,
  TextHTwoIcon,
  TextItalicIcon,
  TextStrikethroughIcon,
  TextUnderlineIcon,
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
      id: "underline",
      label: "Underline",
      icon: TextUnderlineIcon,
      run: (e) => e.chain().focus().toggleUnderline().run(),
      isActive: (e) => e.isActive("underline"),
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
      id: "h1",
      label: "Heading 1",
      icon: TextHOneIcon,
      run: (e) => e.chain().focus().toggleHeading({ level: 1 }).run(),
      isActive: (e) => e.isActive("heading", { level: 1 }),
    },
    {
      id: "h2",
      label: "Heading 2",
      icon: TextHTwoIcon,
      run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
      isActive: (e) => e.isActive("heading", { level: 2 }),
    },
    {
      id: "h3",
      label: "Heading 3",
      icon: TextHThreeIcon,
      run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),
      isActive: (e) => e.isActive("heading", { level: 3 }),
    },
  ],
  [
    {
      id: "align-left",
      label: "Align left",
      icon: TextAlignLeftIcon,
      run: (e) => e.chain().focus().setTextAlign("left").run(),
      isActive: (e) => e.isActive({ textAlign: "left" }),
    },
    {
      id: "align-center",
      label: "Align center",
      icon: TextAlignCenterIcon,
      run: (e) => e.chain().focus().setTextAlign("center").run(),
      isActive: (e) => e.isActive({ textAlign: "center" }),
    },
    {
      id: "align-right",
      label: "Align right",
      icon: TextAlignRightIcon,
      run: (e) => e.chain().focus().setTextAlign("right").run(),
      isActive: (e) => e.isActive({ textAlign: "right" }),
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
      id: "task",
      label: "Checklist",
      icon: CheckSquareIcon,
      run: (e) => e.chain().focus().toggleTaskList().run(),
      isActive: (e) => e.isActive("taskList"),
    },
    {
      id: "quote",
      label: "Quote",
      icon: QuotesIcon,
      run: (e) => e.chain().focus().toggleBlockquote().run(),
      isActive: (e) => e.isActive("blockquote"),
    },
    {
      id: "code-block",
      label: "Code block",
      icon: CodeBlockIcon,
      run: (e) => e.chain().focus().toggleCodeBlock().run(),
      isActive: (e) => e.isActive("codeBlock"),
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

function ToolbarButton({ action, editor }: { action: Action; editor: Editor }) {
  const active = action.isActive?.(editor) ?? false;
  const disabled = action.isDisabled?.(editor) ?? false;
  return (
    <button
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
}

/** The one ribbon button that needs its own small popover (a URL field)
 *  rather than a plain toggle, so it's kept outside the data-driven
 *  `GROUPS` list. Mirrors the outside-click/Escape pattern already used by
 *  `FilterMenu` in `components/ui/app-sidebar.tsx`. */
function LinkButton({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const [href, setHref] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const active = editor.isActive("link");

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function openMenu() {
    setHref(editor.getAttributes("link").href ?? "");
    setOpen(true);
  }

  function apply() {
    const url = href.trim();
    if (url) {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    } else {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    }
    setOpen(false);
  }

  function remove() {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        title="Link"
        aria-label="Link"
        aria-pressed={active}
        onClick={() => (open ? setOpen(false) : openMenu())}
        className={`inline-flex size-7 items-center justify-center rounded-[10px] transition-colors ${
          active ? "bg-accent-soft text-accent" : "text-muted hover:bg-surface hover:text-ink"
        }`}
      >
        <LinkSimpleIcon size={15} weight="bold" />
      </button>
      {open && (
        <div className="absolute left-0 top-9 z-20 w-64 rounded-[10px] border border-line bg-raised p-2 shadow-xl">
          <input
            ref={inputRef}
            type="url"
            value={href}
            onChange={(e) => setHref(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") apply();
            }}
            placeholder="https://example.com"
            className="w-full rounded-[8px] border border-line bg-surface px-2.5 py-1.5 text-xs outline-none focus:border-accent"
          />
          <div className="mt-2 flex items-center justify-between">
            {active && (
              <button
                type="button"
                onClick={remove}
                className="text-xs font-medium text-faint hover:text-bad"
              >
                Remove link
              </button>
            )}
            <button
              type="button"
              onClick={apply}
              className="ml-auto rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-ink"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

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
          {group.map((action) => (
            <ToolbarButton key={action.id} action={action} editor={editor} />
          ))}
        </div>
      ))}
      <span className="mx-1 h-4 w-px bg-line" aria-hidden />
      <LinkButton editor={editor} />
    </div>
  );
}
