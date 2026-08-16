import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Props {
  content: string;
  /** User bubbles use inverse colours */
  inverted?: boolean;
}

export function MessageBody({ content, inverted }: Props) {
  if (!content) {
    return <span className="opacity-50">…</span>;
  }

  return (
    <div
      className={`aegis-md text-sm leading-relaxed $[
        inverted ? 'aegis-md-inverted' : ''
      }`}
    >
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 opacity-90 hover:opacity-100"
            >
              {children}
            </a>
          ),
          code: ({ className, children, ...props }) => {
            const isBlock = Boolean(className);
            if (isBlock) {
              return (
                <pre className="my-2 overflow-x-auto rounded-lg bg-black/40 p-3 text-xs">
                  <code className={className}>{children}</code>
                </pre>
              );
            }
            return (
              <code
                className="rounded bg-black/25 px-1 py-0.5 font-mono text-[0.85em]"
                {...props}
              >
                {children}
              </code>
            );
          },
          pre: ({ children }) => <>{children}</>,
          ul: ({ children }) => (
            <ul className="my-1 list-disc space-y-0.5 pl-4">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-1 list-decimal space-y-0.5 pl-4">{children}</ol>
          ),
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        }}
      >
        {content}
      </Markdown>
    </div>
  );
}
