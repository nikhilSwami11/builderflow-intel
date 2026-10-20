import type { ChatMessage } from "./chat-types";

/** The idea tree lives inside the conversation: the model ends a reply with a tag like
 *  [[idea: parent=N2 | Short title]] when the discussion lands on an idea. Node ids (N1, N2...)
 *  are assigned in order of appearance, so the server and the browser derive the same tree from
 *  the same messages and nothing extra needs saving. */
export type IdeaNode = { id: string; title: string; parent: string | null; messageId: string };

const TAG = /\[\[idea:\s*parent=([A-Za-z0-9]+)\s*\|\s*([^\]]+?)\s*\]\]/g;
const PARTIAL_TAG = /\s*\[\[[^\]]*$/;

export const stripIdeaTags = (t: string) => t.replace(TAG, "").replace(PARTIAL_TAG, "");

export function buildTree(messages: ChatMessage[]): IdeaNode[] {
  const nodes: IdeaNode[] = [];
  for (const m of messages) {
    if (m.role !== "assistant") continue;
    const text = m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
    for (const [, parent, title] of text.matchAll(TAG)) {
      const known = nodes.some((n) => n.id === parent);
      nodes.push({ id: `N${nodes.length + 1}`, title: title.slice(0, 80), parent: known ? parent : null, messageId: m.id });
    }
  }
  return nodes;
}

export function treeForPrompt(nodes: IdeaNode[]): string {
  if (!nodes.length) return "(empty: the first idea you tag uses parent=root)";
  return nodes.map((n) => `${n.id} (parent ${n.parent ?? "root"}): ${n.title}`).join("\n");
}
