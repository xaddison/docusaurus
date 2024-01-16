import classNames from "classnames";
import { useEffect, useRef, useState } from "react";
import getCaretCoordinates from "textarea-caret";
import OverflowTip from "@/components/kit/OverflowTip";
import { useTagStore } from "@/store/module";
import { EditorRefActions } from ".";

type Props = {
  editorRef: React.RefObject<HTMLTextAreaElement>;
  editorActions: React.ForwardedRef<EditorRefActions>;
};

type Position = { left: number; top: number; height: number };

const TagSuggestions = ({ editorRef, editorActions }: Props) => {
  const [position, setPosition] = useState<Position | null>(null);
  const hide = () => setPosition(null);

  const { state } = useTagStore();
  const tagsRef = useRef(state.tags);
  tagsRef.current = state.tags;

  const [selected, select] = useState(0);
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  const getCurrentWord = (): [word: string, startIndex: number] => {
    const editor = editorRef.current;
    if (!editor) return ["", 0];
    const cursorPos = editor.selectionEnd;
    const before = editor.value.slice(0, cursorPos).match(/\S*$/) || { 0: "", index: cursorPos };
    const after = editor.value.slice(cursorPos).match(/^\S*/) || { 0: "" };
    return [before[0] + after[0], before.index ?? cursorPos];
  };

  const suggestionsRef = useRef<string[]>([]);
  suggestionsRef.current = (() => {
    const input = getCurrentWord()[0].slice(1).toLowerCase();

    const customMatches = (tag: string, input: string) => {
      const tagLowerCase = tag.toLowerCase();
      const inputLowerCase = input.toLowerCase();
      let inputIndex = 0;

      for (let i = 0; i < tagLowerCase.length; i++) {
        if (tagLowerCase[i] === inputLowerCase[inputIndex]) {
          inputIndex++;
          if (inputIndex === inputLowerCase.length) {
            return true;
          }
        }
      }

      return false;
    };

    const matchedTags = tagsRef.current.filter((tag) => customMatches(tag, input));
    return matchedTags.slice(0, 5);
  })();

  const isVisibleRef = useRef(false);
  isVisibleRef.current = !!(position && suggestionsRef.current.length > 0);

  const autocomplete = (tag: string) => {
    if (!editorActions || !("current" in editorActions) || !editorActions.current) return;
    const [word, index] = getCurrentWord();
    editorActions.current.removeText(index, word.length);
    editorActions.current.insertText(`#${tag}`);
    hide();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isVisibleRef.current) return;
    const suggestions = suggestionsRef.current;
    const selected = selectedRef.current;
    if (["Escape", "ArrowLeft", "ArrowRight"].includes(e.code)) hide();
    if ("ArrowDown" === e.code) {
      select((selected + 1) % suggestions.length);
      e.preventDefault();
      e.stopPropagation();
    }
    if ("ArrowUp" === e.code) {
      select((selected - 1 + suggestions.length) % suggestions.length);
      e.preventDefault();
      e.stopPropagation();
    }
    if (["Enter", "Tab"].includes(e.code)) {
      autocomplete(suggestions[selected]);
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const handleInput = () => {
    if (!editorRef.current) return;
    select(0);
    const [word, index] = getCurrentWord();
    const isActive = word.startsWith("#") && !word.slice(1).includes("#");
    isActive ? setPosition(getCaretCoordinates(editorRef.current, index)) : hide();
  };

  const listenersAreRegisteredRef = useRef(false);
  const registerListeners = () => {
    const editor = editorRef.current;
    if (!editor || listenersAreRegisteredRef.current) return;
    editor.addEventListener("click", hide);
    editor.addEventListener("blur", hide);
    editor.addEventListener("keydown", handleKeyDown);
    editor.addEventListener("input", handleInput);
    listenersAreRegisteredRef.current = true;
  };
  useEffect(registerListeners, [!!editorRef.current]);

  if (!isVisibleRef.current || !position) return null;
  return (
    <div
      className="z-20 p-1 mt-1 -ml-2 absolute max-w-[12rem] gap-px rounded font-mono flex flex-col justify-start items-start overflow-auto shadow bg-zinc-200 dark:bg-zinc-600"
      style={{ left: position.left, top: position.top + position.height }}
    >
      {suggestionsRef.current.map((tag, i) => (
        <div
          key={tag}
          onMouseDown={() => autocomplete(tag)}
          className={classNames(
            "rounded p-1 px-2 w-full truncate text-sm dark:text-gray-300 cursor-pointer hover:bg-zinc-300 dark:hover:bg-zinc-700",
            i === selected ? "bg-zinc-300 dark:bg-zinc-700" : ""
          )}
        >
          <OverflowTip>#{tag}</OverflowTip>
        </div>
      ))}
    </div>
  );
};

export default TagSuggestions;
