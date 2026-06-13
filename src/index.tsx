if (Bun.argv.includes("init")) {
  const { init } = await import("./cli/init");
  init();
  process.exit(0);
}

import { For } from "solid-js";
import { render, useKeyboard } from "@opentui/solid";
import { ConsolePosition } from "@opentui/core";
import Pane from "./components/pane";
import FileExplorer from "./components/file-explorer";
import RequestList from "./components/request-list";
import RequestDetail from "./components/request-detail";
import ResponseViewer from "./components/response-viewer";
import EnvModal from "./components/env-modal";
import HelpModal from "./components/help-modal";
import { appStore, setAppStore } from "./stores/appStore";
import { Pane as PaneEnum } from "./utils/panes";

render(
  () => {
    useKeyboard((key) => {
      const paneOrder = [
        PaneEnum.FILE_EXPLORER,
        PaneEnum.REQUEST_LIST,
        PaneEnum.REQUEST_DETAIL,
        PaneEnum.RESPONSE_VIEWER,
      ];

      if (key.name === "tab") {
        const current = paneOrder.indexOf(appStore.activePane);
        if (current === -1) return;
        setAppStore("activePane", paneOrder[(current + 1) % paneOrder.length]!);
      } else if (key.name === "1") {
        setAppStore("activePane", PaneEnum.FILE_EXPLORER);
      } else if (key.name === "2") {
        setAppStore("activePane", PaneEnum.REQUEST_LIST);
      } else if (key.name === "3") {
        setAppStore("activePane", PaneEnum.REQUEST_DETAIL);
      } else if (key.name === "4") {
        setAppStore("activePane", PaneEnum.RESPONSE_VIEWER);
      } else if (key.name === "v") {
        if (!appStore.showHelpModal) {
          setAppStore("showEnvModal", !appStore.showEnvModal);
          if (appStore.showEnvModal) {
            setAppStore("activePane", PaneEnum.ENV_MODAL);
          }
        }
      } else if (key.name === "?") {
        if (!appStore.showEnvModal) {
          setAppStore("showHelpModal", !appStore.showHelpModal);
          if (appStore.showHelpModal) {
            setAppStore("activePane", PaneEnum.HELP);
          } else {
            setAppStore("activePane", PaneEnum.FILE_EXPLORER);
          }
        }
      } else if (key.name === "q") {
        process.exit(0);
      }
    });

    const isModal = () => appStore.showEnvModal || appStore.showHelpModal;

    return (
      <box flexDirection="column" width="100%" height="100%">
        <box flexGrow={1} width="100%" flexDirection="row">
          {isModal() ? (
            appStore.showHelpModal ? (
              <Pane width="100%" height="100%" title="Help" focused={true}>
                <HelpModal />
              </Pane>
            ) : (
              <Pane width="100%" height="100%" title="Environment Selector" focused={true}>
                <EnvModal />
              </Pane>
            )
          ) : (
            <>
              <Pane
                width="25%"
                height="100%"
                title={"[1] Explorer"}
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
        <box width="100%" height={1} flexDirection="row">
          <For each={appStore.hotkeyBarItems}>
            {(item) => <text>  {item.key} {item.label}</text>}
          </For>
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
