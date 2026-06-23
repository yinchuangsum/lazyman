import { createMemo, type Accessor } from "solid-js";
import { useKeyboard } from "@opentui/solid";
import { appStore, setAppStore } from "../stores/appStore";
import { Pane } from "../utils/panes";

export function useSearchFilter<T>(
  pane: Pane,
  items: Accessor<T[]>,
  matcher: (item: T, query: string) => boolean,
): { filtered: Accessor<T[]> } {
  useKeyboard((key) => {
    if (appStore.activePane !== pane) return;

    if (key.name === "slash" || key.name === "/") {
      setAppStore("showSearch", true);
      const existing = appStore.activeFilters[pane];
      setAppStore("searchQuery", existing ?? "");
    }
  });

  const filtered = createMemo(() => {
    const query = appStore.activeFilters[pane];
    if (!query) return items();
    return items().filter((item) => matcher(item, query));
  });

  return { filtered };
}
