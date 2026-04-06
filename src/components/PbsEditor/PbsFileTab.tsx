import { usePbsFile } from "./usePbsFile";
import { PbsSectionList } from "./PbsSectionList";
import { PbsFieldEditor } from "./PbsFieldEditor";

interface Props {
  projectPath: string;
  filename: string;
}

export function PbsFileTab({ projectPath, filename }: Props) {
  const pbs = usePbsFile(projectPath, filename);

  if (pbs.loading) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#8c8fa1", fontSize: 12 }}>
        Loading {filename}...
      </div>
    );
  }

  if (pbs.error) {
    return (
      <div style={{ flex: 1, padding: 16, color: "#d20f39", fontSize: 12 }}>
        Error: {pbs.error}
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
      <PbsSectionList
        filename={filename}
        sections={pbs.sections}
        selectedHeader={pbs.selectedHeader}
        onSelect={pbs.select}
        onAdd={pbs.addSection}
        onDelete={pbs.deleteSection}
      />
      <PbsFieldEditor
        filename={filename}
        section={pbs.selected}
        onUpdateField={pbs.updateField}
        onAddField={pbs.addField}
        onDeleteField={pbs.deleteField}
      />
    </div>
  );
}
