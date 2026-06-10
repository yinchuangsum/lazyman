import { createStore } from "solid-js/store";
import { Pages } from "../utils/pages";

type AppStoreType = {
  page: Pages;
};

export const [appStore, setAppStore] = createStore<AppStoreType>({
  page: Pages.LEFT_PANEL,
});
