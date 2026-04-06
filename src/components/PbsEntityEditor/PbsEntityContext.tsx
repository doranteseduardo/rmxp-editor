import { createContext, useContext } from "react";
import type { PbsIndex } from "../../services/pbsIndex";

interface PbsEntityContextType {
  pbsIndex: PbsIndex;
  projectPath: string;
  mapNames: Map<number, string>;
}

export const PbsEntityContext = createContext<PbsEntityContextType>({
  pbsIndex: new Map(),
  projectPath: "",
  mapNames: new Map(),
});

export function usePbsEntityContext() {
  return useContext(PbsEntityContext);
}
