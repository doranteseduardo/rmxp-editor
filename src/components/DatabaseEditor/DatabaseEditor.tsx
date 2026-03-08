/**
 * Database Editor — the main shell with 13 tab navigation.
 *
 * Matches the official RMXP database editor layout:
 * Actors, Classes, Skills, Items, Weapons, Armors, Enemies, Troops,
 * States, Animations, Tilesets, Common Events, System.
 */
import { useState } from "react";
import { DatabaseNamesProvider } from "./DatabaseContext";
import { ActorsTab } from "./tabs/ActorsTab";
import { ClassesTab } from "./tabs/ClassesTab";
import { SkillsTab } from "./tabs/SkillsTab";
import { ItemsTab } from "./tabs/ItemsTab";
import { WeaponsTab } from "./tabs/WeaponsTab";
import { ArmorsTab } from "./tabs/ArmorsTab";
import { EnemiesTab } from "./tabs/EnemiesTab";
import { TroopsTab } from "./tabs/TroopsTab";
import { StatesTab } from "./tabs/StatesTab";
import { AnimationsTab } from "./tabs/AnimationsTab";
import { TilesetsTab } from "./tabs/TilesetsTab";
import { CommonEventsTab } from "./tabs/CommonEventsTab";
import { SystemTab } from "./tabs/SystemTab";
import "./DatabaseEditor.css";

const TABS = [
  "Actors", "Classes", "Skills", "Items", "Weapons", "Armors",
  "Enemies", "Troops", "States", "Animations", "Tilesets",
  "Common Events", "System",
] as const;

type TabName = (typeof TABS)[number];

interface Props {
  projectPath: string;
}

export function DatabaseEditor({ projectPath }: Props) {
  const [activeTab, setActiveTab] = useState<TabName>("Actors");

  const renderTab = () => {
    switch (activeTab) {
      case "Actors": return <ActorsTab projectPath={projectPath} />;
      case "Classes": return <ClassesTab projectPath={projectPath} />;
      case "Skills": return <SkillsTab projectPath={projectPath} />;
      case "Items": return <ItemsTab projectPath={projectPath} />;
      case "Weapons": return <WeaponsTab projectPath={projectPath} />;
      case "Armors": return <ArmorsTab projectPath={projectPath} />;
      case "Enemies": return <EnemiesTab projectPath={projectPath} />;
      case "Troops": return <TroopsTab projectPath={projectPath} />;
      case "States": return <StatesTab projectPath={projectPath} />;
      case "Animations": return <AnimationsTab projectPath={projectPath} />;
      case "Tilesets": return <TilesetsTab projectPath={projectPath} />;
      case "Common Events": return <CommonEventsTab projectPath={projectPath} />;
      case "System": return <SystemTab projectPath={projectPath} />;
    }
  };

  return (
    <DatabaseNamesProvider projectPath={projectPath}>
      <div className="db-editor">
        <div className="db-tabs">
          {TABS.map((tab) => (
            <button
              key={tab}
              className={`db-tab${activeTab === tab ? " active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
        {renderTab()}
      </div>
    </DatabaseNamesProvider>
  );
}
