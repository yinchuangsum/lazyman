import { createEffect } from "solid-js";
import { appStore, setAppStore } from "../stores/appStore";
import { Pane } from "../utils/panes";
import type { HotkeyItem } from "../types";

export function useHotkeyBar(pane: Pane, items: () => HotkeyItem[]) {
  createEffect(() => {
    if (appStore.activePane === pane) {
      setAppStore("hotkeyBarItems", items());
    }
  });
}
