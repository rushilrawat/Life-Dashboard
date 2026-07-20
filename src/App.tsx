import { useEffect, useState } from "react";
import Board from "./components/Board";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import * as storage from "./lib/storage";
import { applyTheme } from "./styles/themes";
import type { Settings } from "./types";

export const defaultSettings: Settings = {
  displayName: "",
  themeName: "Forest",
  themeMode: "dark",
  connectors: [],
};

export default function App() {
  const [settings, setSettings] = useState<Settings>(
    () => storage.get("settings") ?? defaultSettings,
  );
  const [blocks] = useState(() => storage.get("blocks") ?? []);

  useEffect(() => {
    storage.set("settings", settings);
    applyTheme(settings);
  }, [settings]);

  const updateSettings = (patch: Partial<Settings>) =>
    setSettings((s) => ({ ...s, ...patch }));

  return (
    <>
      <Sidebar settings={settings} onSettingsChange={updateSettings} />
      <main className="main">
        <Header displayName={settings.displayName} />
        <Board blocks={blocks} />
      </main>
    </>
  );
}
