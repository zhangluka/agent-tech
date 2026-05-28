'use client';

import ReactMarkdown from 'react-markdown';
import { Components } from 'react-markdown';
import CodeBlock from './CodeBlock';

const components: Components = {
  code({ className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || '');
    const isBlock = String(children).includes('\n');

    if (match || isBlock) {
      return (
        <CodeBlock language={match?.[1] ?? ''}>
          {String(children).replace(/\n$/, '')}
        </CodeBlock>
      );
    }

    return (
      <code className="bg-gray-200 px-1 py-0.5 rounded text-sm" {...props}>
        {children}
      </code>
    );
  },
};

export default function MarkdownMessage({ content }: { content: string }) {
  return (
    <div className="prose prose-sm max-w-none">
      <ReactMarkdown components={components}>{content}</ReactMarkdown>
    </div>
  );
}
