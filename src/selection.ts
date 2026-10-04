export interface RepositorySelection {
  fullName: string;
  url: string;
}

const repositoryPattern =
  /^([a-z\d](?:[a-z\d-]{0,37}[a-z\d])?)\/([a-z\d._-]{1,100})$/i;

export function parseSelection(
  selection: string | undefined,
): RepositorySelection | null {
  const match = repositoryPattern.exec(selection?.trim() ?? '');
  const owner = match?.[1];
  const repository = match?.[2];

  if (
    !owner ||
    !repository ||
    owner.includes('--') ||
    repository === '.' ||
    repository === '..'
  ) {
    return null;
  }

  // Both components are allowlisted; the selected text never supplies an origin.
  return {
    fullName: `${owner}/${repository}`,
    url: `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}`,
  };
}
