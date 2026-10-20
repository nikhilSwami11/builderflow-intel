import type { ChatMessage } from "./chat-types";

/** The assistant only PROPOSES ideas. A proposal joins the tree once the user accepts it, so the
 *  tree holds directions the user chose. `Decisions` records those clicks, keyed by node id. */
export type Decisions = Record<string, "accepted" | "dismissed">;
export type IdeaStatus = "pending" | "accepted" | "dismissed";
export type IdeaNode = {
  id: string;
  title: string;
  why: string;
  anchor: string | null;
  parent: string | null;
  messageId: string;
  status: IdeaStatus;
};

/** Every proposal in the conversation. Ids (N1, N2...) follow order of appearance, so the server
 *  and the browser derive the same ids from the same messages. */
export function buildIdeas(
  messages: ChatMessage[],
  decisions: Decisions,
): IdeaNode[] {
  const nodes: IdeaNode[] = [];
  for (const m of messages) {
    for (const p of m.parts) {
      if (p.type !== "data-idea") continue;
      const id = `N${nodes.length + 1}`;
      const known = nodes.some((n) => n.id === p.data.parent);
      nodes.push({
        id,
        title: p.data.title,
        why: p.data.why,
        anchor: p.data.anchor ?? null,
        parent: known ? p.data.parent : null,
        messageId: m.id,
        status: decisions[id] ?? "pending",
      });
    }
  }
  return nodes;
}

/** The tree the user sees: accepted ideas only, each attached to its nearest accepted ancestor. */
export function acceptedTree(all: IdeaNode[]): IdeaNode[] {
  const byId = new Map(all.map((n) => [n.id, n]));
  const nearest = (parent: string | null): string | null => {
    let cur = parent ? byId.get(parent) : undefined;
    while (cur && cur.status !== "accepted")
      cur = cur.parent ? byId.get(cur.parent) : undefined;
    return cur?.id ?? null;
  };
  return all
    .filter((n) => n.status === "accepted")
    .map((n) => ({ ...n, parent: nearest(n.parent) }));
}

export function treeForPrompt(all: IdeaNode[]): string {
  return all.length
    ? all
        .map(
          (n) =>
            `${n.id} [${n.status}] (parent ${n.parent ?? "root"}): ${n.title}`,
        )
        .join("\n")
    : "(none yet)";
}
