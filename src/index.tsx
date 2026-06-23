if (Bun.argv.includes("init")) {
  const { init } = await import("./cli/init");
  init();
  process.exit(0);
}

import { render, useKeyboard } from "@opentui/solid";
import { BoxRenderable, ConsolePosition, InputRenderable } from "@opentui/core";
import Pane from "./components/pane";
import FileExplorer from "./components/file-explorer";
import RequestList from "./components/request-list";
import RequestDetail from "./components/request-detail";
import ResponseViewer from "./components/response-viewer";
import EnvModal from "./components/env-modal";
import HelpModal from "./components/help-modal";
import { appStore, mode, setAppStore } from "./stores/appStore";
import { Pane as PaneEnum } from "./utils/panes";
import { HIGHLIGHT_BG } from "./style";
import { createEffect } from "solid-js";

render(
  () => {
    let inputRef!: HTMLInputElement;
    useKeyboard((key) => {
      const paneOrder = [
        PaneEnum.FILE_EXPLORER,
        PaneEnum.REQUEST_LIST,
        PaneEnum.REQUEST_DETAIL,
        PaneEnum.RESPONSE_VIEWER,
      ];
      const isModal = appStore.showEnvModal || appStore.showHelpModal;

      if (mode() !== "normal") return;

      if (key.name === "escape" && !isModal && !appStore.showSearch) {
        const pane = appStore.activePane;
        if (appStore.activeFilters[pane]) {
          const next = { ...appStore.activeFilters };
          delete next[pane];
          setAppStore("activeFilters", next);
          return;
        }
      }

      if (key.name === "tab") {
        if (isModal) return;
        const current = paneOrder.indexOf(appStore.activePane);
        if (current === -1) return;
        setAppStore("activePane", paneOrder[(current + 1) % paneOrder.length]!);
      } else if (key.name === "1") {
        if (isModal) return;
        setAppStore("activePane", PaneEnum.FILE_EXPLORER);
      } else if (key.name === "2") {
        if (isModal) return;
        setAppStore("activePane", PaneEnum.REQUEST_LIST);
      } else if (key.name === "3") {
        if (isModal) return;
        setAppStore("activePane", PaneEnum.REQUEST_DETAIL);
      } else if (key.name === "4") {
        if (isModal) return;
        setAppStore("activePane", PaneEnum.RESPONSE_VIEWER);
      } else if (key.name === "v") {
        if (appStore.showHelpModal) return;
        setAppStore("showEnvModal", !appStore.showEnvModal);
        if (appStore.showEnvModal) {
          setAppStore("activePane", PaneEnum.ENV_MODAL);
        } else {
          setAppStore("activePane", PaneEnum.FILE_EXPLORER);
        }
      } else if (key.name === "?") {
        if (appStore.showEnvModal) return;
        setAppStore("showHelpModal", !appStore.showHelpModal);
        if (appStore.showHelpModal) {
          setAppStore("activePane", PaneEnum.HELP);
        } else {
          setAppStore("activePane", PaneEnum.FILE_EXPLORER);
        }
      } else if (key.name === "q") {
        process.exit(0);
      }
    });

    const isModal = () => appStore.showEnvModal || appStore.showHelpModal;

    createEffect(() => {
      if (appStore.showSearch && inputRef) {
        inputRef.focus();
      }

      if (!appStore.showSearch && inputRef) {
        inputRef.blur();
      }
    });

    return (
      <box flexDirection="column" width="100%" height="100%">
        <text>{mode()}</text>
        <box flexGrow={1} width="100%" flexDirection="row">
          {isModal() ? (
            <box
              width="100%"
              height="100%"
              alignItems="center"
              justifyContent="center"
            >
              {appStore.showHelpModal ? (
                <Pane width="70%" height="85%" title="Help" focused={true}>
                  <HelpModal />
                </Pane>
              ) : (
                <Pane
                  width="50%"
                  height="60%"
                  title="Environment Selector"
                  focused={true}
                >
                  <EnvModal />
                </Pane>
              )}
            </box>
          ) : (
            <>
              <Pane
                width="25%"
                height="100%"
                title={
                  appStore.explorerTabIndex === 0
                    ? "[1]— ▶ Files - History"
                    : "[1]— Files - ▶ History"
                }
                focused={appStore.activePane === PaneEnum.FILE_EXPLORER}
              >
                <FileExplorer />
              </Pane>
              <box width="75%" height="100%" flexDirection="column">
                <box width="100%" height="40%" flexDirection="row">
                  <Pane
                    width="35%"
                    height="100%"
                    title={"[2] Req List"}
                    focused={appStore.activePane === PaneEnum.REQUEST_LIST}
                  >
                    <RequestList />
                  </Pane>
                  <Pane
                    width="65%"
                    height="100%"
                    title={"[3] Req Detail"}
                    focused={appStore.activePane === PaneEnum.REQUEST_DETAIL}
                  >
                    <RequestDetail />
                  </Pane>
                </box>
                <Pane
                  width="100%"
                  height="60%"
                  title={"[4] Response"}
                  focused={appStore.activePane === PaneEnum.RESPONSE_VIEWER}
                >
                  <ResponseViewer />
                </Pane>
              </box>
            </>
          )}
        </box>
        <box width="100%" height={2} flexDirection="row">
          {appStore.showSearch ? (
            <box flexDirection="row">
              <text width={8}>Filter: </text>
              <input
                ref={inputRef}
                width={500}
                placeholder="/search..."
                onInput={(e) => {
                  setAppStore("searchQuery", e);
                  console.log(appStore.searchQuery);
                }}
                onSubmit={(e) => {
                  console.log(e);
                }}
              />
            </box>
          ) : mode() === "filter" ? (
            <text fg={HIGHLIGHT_BG}>
              {" "}
              Filter: matches for '{appStore.activeFilters[appStore.activePane]}
              ' Esc: Exit filter mode
            </text>
          ) : (
            <text fg={HIGHLIGHT_BG}>
              {" "}
              {appStore.hotkeyBarItems
                .map((item) => `${item.label}: ${item.key}`)
                .join("  |  ")}
            </text>
          )}
        </box>
      </box>
    );
  },
  {
    targetFps: 30,
    consoleMode: "console-overlay",
    consoleOptions: {
      position: ConsolePosition.BOTTOM,
    },
  },
);
