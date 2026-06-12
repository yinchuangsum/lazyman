import type { BoxRenderable, RenderableOptions } from "@opentui/core";
import { mergeProps, splitProps, type JSX } from "solid-js";
import { DEFAULT_BORDER_COLOR, FOCUSED_BORDER_COLOR } from "../style";

export type PaneProps = {
  children?: JSX.Element;
  title: string;
  focused?: boolean;
} & RenderableOptions<BoxRenderable>;

export default (rawProps: PaneProps) => {
  const props = mergeProps(
    { width: "100%", height: "100%", focused: false },
    rawProps,
  ) as PaneProps;

  const [local, boxProps] = splitProps(props, [
    "children",
    "width",
    "title",
    "height",
    "focused",
  ]);

  return (
    <box
      width={local.width}
      height={local.height}
      borderColor={local.focused ? FOCUSED_BORDER_COLOR : DEFAULT_BORDER_COLOR}
      title={local.title}
      titleAlignment="left"
      {...boxProps}
    >
      {local.children}
    </box>
  );
};
