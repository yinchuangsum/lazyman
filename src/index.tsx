if (Bun.argv.includes("init")) {
  const { init } = await import("./cli/init");
  init();
  process.exit(0);
}

import { render, useKeyboard } from "@opentui/solid";
import { ConsolePosition } from "@opentui/core";
import Pane from "./components/pane";
import FileExplorer from "./components/file-explorer";
import RequestViewer from "./components/request-viewer";
import ResponseViewer from "./components/response-viewer";
import EnvModal from "./components/env-modal";
import { appStore, setAppStore } from "./stores/appStore";
import { Pane as PaneEnum } from "./utils/panes";

render(
  () => {
    useKeyboard((key) => {
      const paneOrder = [
        PaneEnum.FILE_EXPLORER,
        PaneEnum.REQUEST_VIEWER,
        PaneEnum.RESPONSE_VIEWER,
      ];

      if (key.name === "tab") {
        const current = paneOrder.indexOf(appStore.activePane);
        setAppStore("activePane", paneOrder[(current + 1) % paneOrder.length]);
      } else if (key.name === "1") {
        setAppStore("activePane", PaneEnum.FILE_EXPLORER);
      } else if (key.name === "2") {
        setAppStore("activePane", PaneEnum.REQUEST_VIEWER);
      } else if (key.name === "3") {
        setAppStore("activePane", PaneEnum.RESPONSE_VIEWER);
      } else if (key.name === "v") {
        setAppStore("showEnvModal", !appStore.showEnvModal);
        if (appStore.showEnvModal) {
          setAppStore("activePane", PaneEnum.ENV_MODAL);
        }
      } else if (key.name === "q") {
        process.exit(0);
      }
    });

    const isModal = () => appStore.showEnvModal;

    const style = () => ({
      width: "100%" as const,
      height: "100%" as const,
      flexDirection: "row" as const,
    });

    return (
      <box {...style()}>
        {isModal() ? (
          <Pane
            width="100%"
            height="100%"
            title={"Environment Selector"}
            focused={true}
          >
            <EnvModal />
          </Pane>
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
              <Pane
                width="100%"
                height="40%"
                title={"[2] Request"}
                focused={appStore.activePane === PaneEnum.REQUEST_VIEWER}
              >
                <RequestViewer />
              </Pane>
              <Pane
                width="100%"
                height="60%"
                title={"[3] Response"}
                focused={appStore.activePane === PaneEnum.RESPONSE_VIEWER}
              >
                <ResponseViewer />
              </Pane>
            </box>
          </>
        )}
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
