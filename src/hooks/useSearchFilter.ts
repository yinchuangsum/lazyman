import { createMemo, type Accessor } from "solid-js";
import { useKeyboard } from "@opentui/solid";
import { appStore, mode, setAppStore } from "../stores/appStore";
import { Pane } from "../utils/panes";

export function useSearchFilter<T>(
  pane: Pane,
  items: Accessor<T[]>,
  matcher: (item: T, query: string) => boolean,
): { filtered: Accessor<T[]> } {
  useKeyboard((key) => {
    if (appStore.activePane !== pane) return;

    if (mode() === "normal") {
      if (key.name === "/") {
        const existing = appStore.activeFilters[pane];
        setAppStore("searchQuery", existing ?? "");
        setAppStore("showSearch", true);
        key.preventDefault();
      }
    }

    if (mode() === "input") {
      if (key.name === "escape") {
        setAppStore("showSearch", false);
        setAppStore("searchQuery", "");
        const { [pane]: removed, ...rest } = appStore.activeFilters;
        console.log(rest);
        setAppStore("activeFilters", rest);
      }

      if (key.name === "return") {
        setAppStore("showSearch", false);
        setAppStore("activeFilters", {
          ...appStore.activeFilters,
          [pane]: appStore.searchQuery,
        });

        console.log(appStore.activeFilters);
      }
    }

    if (mode() === "filter") {
      if (key.name === "escape") {
        setAppStore("showSearch", false);
        setAppStore("searchQuery", "");
        const { [pane]: removed, ...rest } = appStore.activeFilters;
        console.log(rest);
        setAppStore("activeFilters", rest);
      }
    }
  });

  const filtered = createMemo(() => {
    const query = appStore.activeFilters[pane];
    if (!query) return items();
    return items().filter((item) => matcher(item, query));
  });

  return { filtered };
}
