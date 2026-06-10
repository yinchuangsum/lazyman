import { render, useKeyboard } from "@opentui/solid";
import Panel from "./components/panel";
import { joinTitle } from "./utils/title";
import { appStore, setAppStore } from "./stores/appStore";
import { Pages } from "./utils/pages";
import { ConsolePosition } from "@opentui/core";

render(
  () => {
    useKeyboard((key) => {
      console.log(key);
      if (key.name === "1") {
        setAppStore("page", Pages.LEFT_PANEL);
      } else if (key.name === "2") {
        setAppStore("page", Pages.RIGHT_PANEL);
      }
    });

    const activePage = () => appStore.page;

    return (
      <box width={"100%"} height={"100%"} style={{}} flexDirection="row">
        <Panel
          width={"25%"}
          title={joinTitle("[1]", "Left Panel")}
          height={"100%"}
          focused={appStore.page === Pages.LEFT_PANEL}
        >
          <text>Left Panel</text>
          <text>{appStore.page}</text>
        </Panel>
        <Panel
          width={"75%"}
          title={joinTitle("[2]", "Right Panel")}
          height={"100%"}
          focused={appStore.page === Pages.RIGHT_PANEL}
        >
          <text>Right Panel</text>
        </Panel>
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
