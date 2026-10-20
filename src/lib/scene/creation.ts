/** An empty description opens a blank studio, never a preselected template. */
export function creationSearch(description: string): { prompt: string | undefined; blank: boolean | undefined } {
  const prompt = description.trim();
  return prompt ? { prompt, blank: undefined } : { prompt: undefined, blank: true };
}