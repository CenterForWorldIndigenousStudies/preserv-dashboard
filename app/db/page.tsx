import fs from 'fs';
import path from 'path';
import type { ReactElement } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { PageHeader } from "@organisms/PageHeader";
import { MermaidDiagram } from "@organisms/MermaidDiagram";

export const dynamic = 'force-dynamic';

export default function DbPage(): ReactElement {
  const filePath = path.join(process.cwd(), 'documentation/db/PRESERVATION_DB.md');
  const source = fs.readFileSync(filePath, 'utf-8');

  const components: Components = {
    pre({ children }: { children?: React.ReactNode }) {
      return <pre className="not-prose rounded bg-sand p-4 overflow-x-auto">{children}</pre>;
    },
    code(args: { className?: string; children?: React.ReactNode }) {
      const className = args.className;
      const children = args.children;
      const match = /language-(\w+)/.exec(className ?? '');
      const language = match?.[1];

      if (language === 'mermaid') {
        const diagramSource = String(children as unknown).replace(/\n$/, '');
        return <MermaidDiagram source={diagramSource} />;
      }

      if (language) {
        return (
          <code className={`rounded bg-clay/10 px-1.5 py-0.5 text-xs font-medium text-ink ${className ?? ''}`}>
            {children}
          </code>
        );
      }

      return (
        <code className={className}>
          {children}
        </code>
      );
    },
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Database Schema"
        title="CWIS Preservation Database"
        description="Entity-relationship diagram and design notes for the preservation MySQL database."
      />

      <div className="rounded-2xl border border-moss/15 bg-white/80 px-6 py-4 shadow-panel">
        <p className="text-sm text-ink/70">
          Edit the schema diagram in <code className="rounded bg-sand px-1.5 py-0.5 text-xs font-medium text-ink">documentation/db/PRESERVATION_DB.md</code>.
          Changes appear here after deployment.
        </p>
      </div>

      <article className="prose prose-sm max-w-none rounded-2xl border border-moss/15 bg-white p-8 shadow-panel prose-headings:text-ink prose-p:text-ink/80 prose-a:text-moss prose-strong:text-ink prose-code:rounded prose-code:bg-sand prose-code:px-1.5 prose-code:py-0.5 prose-code:text-xs prose-ul:list-disc prose-ol:list-decimal prose-li:text-ink/80">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
          {source}
        </ReactMarkdown>
      </article>
    </div>
  );
}