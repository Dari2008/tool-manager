export interface SavedWorkflow {
  id:      string;
  name:    string;
  graph:   unknown;       // BaklavaJS IEditorState
  runs:    string[][];    // each run is an array of job UUIDs
}
