import { createContext, useContext } from "react";
import type { PbsIndex } from "../../services/pbsIndex";

interface PbsContextType {
  pbsIndex: PbsIndex;
  projectPath: string;
}

export const PbsContext = createContext<PbsContextType>({
  pbsIndex: new Map(),
  projectPath: "",
});

export function usePbsContext() {
  return useContext(PbsContext);
}
