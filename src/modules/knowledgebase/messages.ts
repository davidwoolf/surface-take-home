// User-facing knowledgebase messages, shared by the CLI, the API and the UI.

export const messages = {
  invalid: (problem: string) =>
    `The handbook in knowledgebase/ can't be loaded: ${problem}. It's committed to the repo, so \`git checkout -- knowledgebase\` restores it.`,
} as const;
