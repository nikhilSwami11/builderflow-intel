import type { ChatMessage } from "./chat-types";

/** Ideas the assistant flagged during the conversation. Node ids (N1, N2...) are assigned in
 *  order of appearance, so the server and the browser derive the same tree from the same messages. */
export type IdeaNode = { id: string; title: string; why: string; parent: string | null; messageId: string };

export function buildTree(messages: ChatMessage[]): IdeaNode[] {
  const nodes: IdeaNode[] = [];
  for (const m of messages) {
    for (const p of m.parts) {
      if (p.type !== "data-idea") continue;
      const known = nodes.some((n) => n.id === p.data.parent);
      nodes.push({ id: `N${nodes.length + 1}`, title: p.data.title, why: p.data.why, parent: known ? p.data.parent : null, messageId: m.id });
    }
  }
  return nodes;
}

export function treeForPrompt(nodes: IdeaNode[]): string {
  return nodes.length ? nodes.map((n) => `${n.id} (parent ${n.parent ?? "root"}): ${n.title}`).join("\n") : "(empty)";
}
