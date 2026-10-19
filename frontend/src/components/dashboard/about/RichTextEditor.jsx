
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { useEffect } from "react";
import {
  Box,
  Flex,
  IconButton,
  Text,
} from "@chakra-ui/react";
import {
  LuBold,
  LuItalic,
  LuHeading1,
  LuHeading2,
  LuList,
  LuListOrdered,
  LuLink,
  LuUndo2,
  LuRedo2,
} from "react-icons/lu";

function ToolbarButton({
  icon,
  label,
  active = false,
  disabled = false,
  onClick,
}) {
  return (
    <IconButton
      type="button"
      size="sm"
      variant={active ? "solid" : "ghost"}
      colorPalette={active ? "blue" : "gray"}
      aria-label={label}
      title={label}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {icon}
    </IconButton>
  );
}

export default function RichTextEditor({
  value = "",
  onChange,
  placeholder = "Write your content here...",
  minHeight = "220px",
  disabled = false,
}) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: {
          rel: "noopener noreferrer nofollow",
        },
      }),
    ],
    content: value || "",
    editable: !disabled,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;

    editor.setEditable(!disabled);
  }, [editor, disabled]);

  useEffect(() => {
    if (!editor) return;

    const nextValue = value || "";

    if (editor.getHTML() !== nextValue) {
      editor.commands.setContent(nextValue, {
        emitUpdate: false,
      });
    }
  }, [editor, value]);

  const setLink = () => {
    if (!editor || disabled) return;

    const previousUrl =
      editor.getAttributes("link").href || "";

    const url = window.prompt(
      "Enter link URL (https://...)",
      previousUrl,
    );

    if (url === null) return;

    const trimmedUrl = url.trim();

    if (!trimmedUrl) {
      editor.chain().focus().unsetLink().run();
      return;
    }

    try {
      const parsed = new URL(trimmedUrl);

      if (
        !["http:", "https:"].includes(parsed.protocol)
      ) {
        window.alert("Only HTTP/HTTPS links are allowed.");
        return;
      }

      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: parsed.href })
        .run();
    } catch {
      window.alert("Please enter a valid URL.");
    }
  };

  if (!editor) return null;

  const canEdit = !disabled;

  return (
    <Box
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="lg"
      overflow="hidden"
      bg="bg"
    >
      <Flex
        p="2"
        gap="1"
        flexWrap="wrap"
        borderBottomWidth="1px"
        bg="bg.muted"
      >
        <ToolbarButton
          icon={<LuBold />}
          label="Bold"
          active={editor.isActive("bold")}
          disabled={!canEdit}
          onClick={() =>
            editor.chain().focus().toggleBold().run()
          }
        />

        <ToolbarButton
          icon={<LuItalic />}
          label="Italic"
          active={editor.isActive("italic")}
          disabled={!canEdit}
          onClick={() =>
            editor.chain().focus().toggleItalic().run()
          }
        />

        <ToolbarButton
          icon={<LuHeading1 />}
          label="Heading 1"
          active={editor.isActive("heading", {
            level: 1,
          })}
          disabled={!canEdit}
          onClick={() =>
            editor
              .chain()
              .focus()
              .toggleHeading({ level: 1 })
              .run()
          }
        />

        <ToolbarButton
          icon={<LuHeading2 />}
          label="Heading 2"
          active={editor.isActive("heading", {
            level: 2,
          })}
          disabled={!canEdit}
          onClick={() =>
            editor
              .chain()
              .focus()
              .toggleHeading({ level: 2 })
              .run()
          }
        />

        <ToolbarButton
          icon={<LuList />}
          label="Bullet List"
          active={editor.isActive("bulletList")}
          disabled={!canEdit}
          onClick={() =>
            editor
              .chain()
              .focus()
              .toggleBulletList()
              .run()
          }
        />

        <ToolbarButton
          icon={<LuListOrdered />}
          label="Numbered List"
          active={editor.isActive("orderedList")}
          disabled={!canEdit}
          onClick={() =>
            editor
              .chain()
              .focus()
              .toggleOrderedList()
              .run()
          }
        />

        <ToolbarButton
          icon={<LuLink />}
          label="Insert Link"
          active={editor.isActive("link")}
          disabled={!canEdit}
          onClick={setLink}
        />

        <ToolbarButton
          icon={<LuUndo2 />}
          label="Undo"
          disabled={
            !canEdit || !editor.can().undo()
          }
          onClick={() =>
            editor.chain().focus().undo().run()
          }
        />

        <ToolbarButton
          icon={<LuRedo2 />}
          label="Redo"
          disabled={
            !canEdit || !editor.can().redo()
          }
          onClick={() =>
            editor.chain().focus().redo().run()
          }
        />
      </Flex>

      <Box
        minH={minHeight}
        p="4"
        css={{
          "& .tiptap": {
            minHeight,
            outline: "none",
            lineHeight: "1.8",
            overflowWrap: "anywhere",
          },
          "& .tiptap p": {
            marginBottom: "0.75rem",
          },
          "& .tiptap h1": {
            fontSize: "1.75rem",
            fontWeight: "bold",
            marginBottom: "0.75rem",
          },
          "& .tiptap h2": {
            fontSize: "1.4rem",
            fontWeight: "semibold",
            marginBottom: "0.75rem",
          },
          "& .tiptap ul": {
            paddingLeft: "1.5rem",
            listStyleType: "disc",
          },
          "& .tiptap ol": {
            paddingLeft: "1.5rem",
            listStyleType: "decimal",
          },
          "& .tiptap a": {
            color: "blue.500",
            textDecoration: "underline",
          },
        }}
      >
        <EditorContent editor={editor} />
      </Box>

      <Flex
        justify="space-between"
        px="4"
        py="2"
        borderTopWidth="1px"
        bg="bg.muted"
      >
        <Text fontSize="xs" color="fg.muted">
          {editor.isEmpty
            ? placeholder
            : "Rich Text Editor"}
        </Text>

        <Text fontSize="xs" color="fg.muted">
          {editor.storage.characterCount
            ? editor.storage.characterCount.characters()
            : editor.getText().length}{" "}
          characters
        </Text>
      </Flex>
    </Box>
  );
}
