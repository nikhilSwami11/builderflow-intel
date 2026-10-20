"use client";

import { Children, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export type Marker = { id: string; anchor: string; title: string };

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The model's markdown reply. Phrases it flagged as ideas become clickable highlights that jump
 *  to their node in the idea tree. */
export function Prose({
  text,
  markers = [],
  onMarker,
}: {
  text: string;
  markers?: Marker[];
  onMarker?: (id: string) => void;
}) {
  const lower = text.toLowerCase();
  const found = markers.filter(
    (m) => m.anchor && lower.includes(m.anchor.toLowerCase()),
  );

  const mark = (node: ReactNode): ReactNode =>
    Children.map(node, (child, k) => {
      if (typeof child !== "string") return child;
      const hits = found.filter((m) =>
        child.toLowerCase().includes(m.anchor.toLowerCase()),
      );
      if (!hits.length) return child;
      const re = new RegExp(
        `(${hits.map((m) => escapeRe(m.anchor)).join("|")})`,
        "i",
      );
      return child.split(re).map((part, i) => {
        const m = hits.find(
          (h) => h.anchor.toLowerCase() === part.toLowerCase(),
        );
        return m ? (
          <button
            key={`${k}-${i}`}
            onClick={() => onMarker?.(m.id)}
            title={`Idea: ${m.title}`}
            className="rounded-sm bg-[#fff1c2] px-0.5 underline decoration-[#c98a00] decoration-2 underline-offset-2 transition-colors duration-150 hover:bg-[#fde68a]"
          >
            {part}
          </button>
        ) : (
          part
        );
      });
    });

  return (
    <div className="space-y-2.5">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p>{mark(children)}</p>,
          li: ({ children }) => <li className="pl-0.5">{mark(children)}</li>,
          strong: ({ children }) => (
            <strong className="font-semibold">{mark(children)}</strong>
          ),
          em: ({ children }) => <em>{mark(children)}</em>,
          ul: ({ children }) => (
            <ul className="list-disc space-y-1 pl-5">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal space-y-1 pl-5">{children}</ol>
          ),
          h1: ({ children }) => (
            <h3 className="pt-1 text-[16px] font-semibold tracking-tight">
              {children}
            </h3>
          ),
          h2: ({ children }) => (
            <h3 className="pt-1 text-[15px] font-semibold tracking-tight">
              {children}
            </h3>
          ),
          h3: ({ children }) => (
            <h4 className="pt-1 text-[14px] font-semibold">{children}</h4>
          ),
          h4: ({ children }) => (
            <h4 className="pt-1 text-[14px] font-semibold">{children}</h4>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 hover:text-text-2"
            >
              {children}
            </a>
          ),
          code: ({ children }) => (
            <code className="rounded bg-accent-wash px-1 py-0.5 font-mono text-[12.5px]">
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="overflow-x-auto rounded-md border border-rule bg-paper p-3 text-[12.5px] [&_code]:bg-transparent [&_code]:p-0">
              {children}
            </pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-rule-strong pl-3 text-text-2">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="border-rule" />,
          table: ({ children }) => (
            <div className="overflow-x-auto rounded-md border border-rule">
              <table className="w-full border-collapse text-left text-[13px]">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-paper">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="border-b border-rule px-3 py-2 font-semibold">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-rule px-3 py-2 align-top last:border-b-0">
              {mark(children)}
            </td>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
