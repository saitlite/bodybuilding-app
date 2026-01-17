'use client';

import React from 'react';

interface MarkdownContentProps {
  content: string;
}

export default function MarkdownContent({ content }: MarkdownContentProps) {
  // シンプルなマークダウン変換（基本的な書式のみ）
  const renderContent = () => {
    const lines = content.split('\n');
    const result: React.ReactElement[] = [];
    let inCodeBlock = false;
    let codeLines: string[] = [];
    let listItems: string[] = [];
    let inList = false;

    const flushList = () => {
      if (listItems.length > 0) {
        result.push(
          <ul key={`list-${result.length}`} className="list-disc list-inside mb-2 space-y-1">
            {listItems.map((item, idx) => (
              <li key={idx} className="text-sm">{item}</li>
            ))}
          </ul>
        );
        listItems = [];
      }
    };

    lines.forEach((line, idx) => {
      // コードブロック
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          result.push(
            <pre key={`code-${idx}`} className="bg-slate-800 text-slate-100 p-3 rounded-lg overflow-x-auto mb-2 text-xs">
              <code>{codeLines.join('\n')}</code>
            </pre>
          );
          codeLines = [];
          inCodeBlock = false;
        } else {
          flushList();
          inCodeBlock = true;
        }
        return;
      }

      if (inCodeBlock) {
        codeLines.push(line);
        return;
      }

      // リスト
      if (line.trim().match(/^[-*]\s/)) {
        const item = line.trim().replace(/^[-*]\s/, '');
        listItems.push(item);
        inList = true;
        return;
      } else if (inList) {
        flushList();
        inList = false;
      }

      // 見出し
      if (line.startsWith('###')) {
        flushList();
        result.push(
          <h3 key={idx} className="text-base font-bold mt-3 mb-2">
            {line.replace(/^###\s*/, '')}
          </h3>
        );
      } else if (line.startsWith('##')) {
        flushList();
        result.push(
          <h2 key={idx} className="text-lg font-bold mt-3 mb-2">
            {line.replace(/^##\s*/, '')}
          </h2>
        );
      } else if (line.startsWith('#')) {
        flushList();
        result.push(
          <h1 key={idx} className="text-xl font-bold mt-3 mb-2">
            {line.replace(/^#\s*/, '')}
          </h1>
        );
      } else if (line.trim() === '') {
        flushList();
        result.push(<div key={idx} className="h-2" />);
      } else {
        flushList();
        // インラインコード、太字、リンクなどの処理
        let processed = line;
        
        // インラインコード `code`
        processed = processed.replace(/`([^`]+)`/g, '<code class="bg-slate-200 px-1 py-0.5 rounded text-xs">$1</code>');
        
        // 太字 **text**
        processed = processed.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        
        result.push(
          <p key={idx} className="text-sm mb-1" dangerouslySetInnerHTML={{ __html: processed }} />
        );
      }
    });

    flushList();

    return result;
  };

  return <div className="markdown-content">{renderContent()}</div>;
}
