// Utility to calculate line-by-line differences between two text strings
export interface LineDiff {
  lineNumber: number;
  type: 'added' | 'removed' | 'unchanged' | 'modified';
  oldContent?: string;
  newContent?: string;
}

export const calculateDiff = (
  originalText: string,
  newText: string
): LineDiff[] => {
  // Split by newline but handle the case where trailing newline creates empty string
  const splitLines = (text: string): string[] => {
    if (text === '') return [''];
    const lines = text.split('\n');
    // If the text ends with \n, split creates an empty string at the end
    // We keep it to accurately represent the file structure
    return lines;
  };

  const originalLines = splitLines(originalText);
  const newLines = splitLines(newText);
  const diffs: LineDiff[] = [];

  let oldIndex = 0;
  let newIndex = 0;

  while (oldIndex < originalLines.length || newIndex < newLines.length) {
    const oldLine = originalLines[oldIndex];
    const newLine = newLines[newIndex];

    if (oldIndex >= originalLines.length) {
      // All remaining lines are added
      diffs.push({
        lineNumber: newIndex + 1,
        type: 'added',
        newContent: newLine,
      });
      newIndex++;
    } else if (newIndex >= newLines.length) {
      // All remaining lines are removed
      diffs.push({
        lineNumber: oldIndex + 1,
        type: 'removed',
        oldContent: oldLine,
      });
      oldIndex++;
    } else if (oldLine === newLine) {
      // Lines are identical
      diffs.push({
        lineNumber: newIndex + 1,
        type: 'unchanged',
        oldContent: oldLine,
        newContent: newLine,
      });
      oldIndex++;
      newIndex++;
    } else {
      // Lines are different - check if it's a modification or add/remove
      // Look ahead to see if the new line appears later in old (insertion)
      // or if the old line appears later in new (deletion)
      
      const newLineInOldLater = originalLines.slice(oldIndex + 1).indexOf(newLine);
      const oldLineInNewLater = newLines.slice(newIndex + 1).indexOf(oldLine);

      if (newLineInOldLater !== -1 && (oldLineInNewLater === -1 || newLineInOldLater < oldLineInNewLater)) {
        // The new line appears later in original, so current old line was removed
        diffs.push({
          lineNumber: oldIndex + 1,
          type: 'removed',
          oldContent: oldLine,
        });
        oldIndex++;
      } else if (oldLineInNewLater !== -1) {
        // The old line appears later in new, so current new line was added
        diffs.push({
          lineNumber: newIndex + 1,
          type: 'added',
          newContent: newLine,
        });
        newIndex++;
      } else {
        // Lines are truly modified
        diffs.push({
          lineNumber: newIndex + 1,
          type: 'modified',
          oldContent: oldLine,
          newContent: newLine,
        });
        oldIndex++;
        newIndex++;
      }
    }
  }

  return diffs;
};

export const getSummary = (diffs: LineDiff[]) => {
  const added = diffs.filter((d) => d.type === 'added').length;
  const removed = diffs.filter((d) => d.type === 'removed').length;
  const modified = diffs.filter((d) => d.type === 'modified').length;

  return { added, removed, modified };
};
