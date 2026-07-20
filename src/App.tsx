import { useEffect, useState } from "react";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import * as storage from "./lib/storage";
import { applyTheme } from "./styles/themes";
import type { Settings } from "./types";

const defaultSettings: Settings = {
  displayName: "Rushil",
  themeName: "Forest",
  themeMode: "dark",
  connectors: [],
};

export default function App() {
  const [settings, setSettings] = useState<Settings>(
    () => storage.get("settings") ?? defaultSettings,
  );

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
        {/* Empty until Phase 2 renders blocks into it. */}
        <section className="board" aria-label="Board" />
      </main>
    </>
  );
}
