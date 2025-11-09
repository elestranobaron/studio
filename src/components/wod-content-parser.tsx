
'use client';

import React from 'react';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';

// --- Type Definitions ---
type LineType = 'title' | 'exercise' | 'instruction' | 'rounds_header' | 'note' | 'empty';
type ParsedLine = { type: LineType; content: string; original: string };

// --- Helper Functions for Text Analysis & Formatting ---
const SECTION_KEYWORDS = ["WARM-UP", "WARMUP", "STRENGTH", "METCON", "CONDITIONING", "ACCESSORY", "COOL-DOWN", "GYMNASTICS", "SKILL", "TECHNIQUE", "PREP", "PLYOMÉTRIE", "HYBRID METCON", "PUISSANCE BAS DU CORPS", "ROWING TECHNIQUE"];
const ROUNDS_KEYWORDS = /^\s*(\d+\s*rounds?|for\s+\d+\s*rounds?|every\s+\d{1,2}:\d{2}.*)/i;
const NOTE_KEYWORDS = /^(int|sc|intermédiaire|scale|beginner|débutant|rx|elite|part \d+)\b.*:?/i;

const toTitleCase = (str: string) => {
    if (!str) return '';
    // This regex handles French accents and converts to title case.
    return str.toLowerCase().replace(/(^|\s|-|')(\p{L})/gu, (match, separator, char) => `${separator}${char.toUpperCase()}`);
};

const classifyLine = (line: string): ParsedLine => {
    const trimmed = line.trim();
    if (!trimmed) return { type: 'empty', content: '', original: line };
    const upper = trimmed.toUpperCase();

    if (SECTION_KEYWORDS.some(keyword => upper.includes(keyword)) && trimmed.split(' ').length < 6) {
      return { type: 'title', content: toTitleCase(trimmed.replace(':', '')), original: line };
    }
    if (NOTE_KEYWORDS.test(trimmed)) {
        return { type: 'note', content: trimmed, original: line };
    }
    if (ROUNDS_KEYWORDS.test(trimmed) || /alternate part/i.test(trimmed) || /part \d+ >/i.test(trimmed)) {
      return { type: 'rounds_header', content: toTitleCase(trimmed), original: line };
    }
     // If it contains numbers and letters, it's likely an exercise
    if (/\d/.test(trimmed) && /[a-zA-Z]/.test(trimmed)) {
        return { type: 'exercise', content: toTitleCase(trimmed), original: line };
    }
    // Default to instruction for anything else
    return { type: 'instruction', content: toTitleCase(trimmed), original: line };
};

// --- Rendering Components ---

const DetailBadge: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <Badge variant="secondary" className={cn("text-xs font-medium ml-2 whitespace-nowrap", className)}>{children}</Badge>
);

const InstructionText: React.FC<{ line: ParsedLine }> = ({ line }) => (
    <p className="text-sm text-muted-foreground italic pl-4 border-l-2 border-muted ml-2 py-1">
        {line.content}
    </p>
);

const RenderExerciseLine: React.FC<{ line: ParsedLine }> = ({ line }) => {
    let text = line.content.replace(/^-|\*/, '').trim();
    
    // Extract details in parentheses or brackets and replace them
    const details = text.match(/\(([^)]+)\)|\[([^\]]+)\]/g) || [];
    text = text.replace(/\(([^)]+)\)|\[([^\]]+)\]/g, '').trim();

    // Replace "Directly" with an arrow
    text = text.replace(/^Directly/i, '→');

    const parts = text.split('+').map(p => p.trim());
  
    return (
        <div className={cn("flex items-start gap-3 pl-2 leading-relaxed")}>
            <span className={cn("h-1.5 w-1.5 rounded-full bg-primary mt-[0.55rem] flex-shrink-0")} />
            <p className="flex-1 text-foreground">
                {parts.map((part, index) => (
                    <React.Fragment key={index}>
                        {part}
                        {index < parts.length - 1 && <span className="text-primary font-bold mx-2">+</span>}
                    </React.Fragment>
                ))}
                {details.map((detail, i) => <DetailBadge key={i}>{toTitleCase(detail.replace(/[()\[\]]/g, ''))}</DetailBadge>)}
            </p>
        </div>
    );
};

const RenderNoteLine: React.FC<{ line: ParsedLine }> = ({ line }) => {
    const parts = line.content.split(/\s*\/\/\s*|\s*\/\s*/).map(p => toTitleCase(p.trim()));
    return (
        <div className="pl-7 text-xs text-muted-foreground italic mt-1 flex items-center gap-2">
            {parts.map((part, index) => (
                <React.Fragment key={index}>
                    {part}
                    {index < parts.length - 1 && <span className="font-sans not-italic text-muted-foreground/50">/</span>}
                </React.Fragment>
            ))}
        </div>
    );
};

const RenderRoundsHeader: React.FC<{ line: ParsedLine }> = ({ line }) => (
    <p className="font-semibold text-foreground flex items-center gap-2 text-base">
        <ArrowRight className="h-4 w-4 text-primary" />
        {line.content}
    </p>
);

// --- Main Component ---

export function WodContentParser({ content }: { content: string }) {
  if (!content) return null;

  const lines = content.split('\n').map(classifyLine);
  
  const renderLine = (line: ParsedLine, index: number) => {
    switch (line.type) {
      case 'title':
        return <h4 key={index} className="font-headline text-lg text-foreground pt-4 first:pt-0">{line.content}</h4>;
      case 'rounds_header':
        return <RenderRoundsHeader key={index} line={line} />;
      case 'exercise':
        return <RenderExerciseLine key={index} line={line} />;
      case 'instruction':
         return <InstructionText key={index} line={line} />;
      case 'note':
        return <RenderNoteLine key={index} line={line} />;
      case 'empty':
        return (index > 0 && lines[index - 1].type !== 'empty') ? <div key={index} className="h-2"></div> : null;
      default:
        return null;
    }
  };

  const blocks: JSX.Element[][] = [];
  let currentBlock: JSX.Element[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const renderedLine = renderLine(line, i);
    if (!renderedLine) continue;

    const isHeader = line.type === 'rounds_header' || line.type === 'title';
    const isExerciseOrNote = line.type === 'exercise' || line.type === 'note';

    if (isHeader) {
      if (currentBlock.length > 0) blocks.push(currentBlock);
      blocks.push([renderedLine]);
      currentBlock = [];
    } else if (isExerciseOrNote) {
      currentBlock.push(renderedLine);
    } else { // instruction or empty
      if (currentBlock.length > 0) blocks.push(currentBlock);
      currentBlock = [];
      blocks.push([renderedLine]);
    }
  }
  if (currentBlock.length > 0) blocks.push(currentBlock);


  return (
    <div className="space-y-3 text-base">
      {blocks.map((block, index) => {
        if (block.length === 0 || block.every(item => item === null)) return null;
        
        const isExerciseBlock = block.some(item => 
            item?.props?.line?.type === 'exercise' || 
            item?.props?.line?.type === 'note'
        );
        const hasHeader = block.some(item => item?.props?.line?.type === 'rounds_header');

        if (isExerciseBlock && !hasHeader) {
             return (
                <div key={index} className="p-4 rounded-lg bg-card border border-border/50 space-y-2">
                    {block}
                </div>
             )
        }
        return <div key={index}>{block}</div>;
      })}
    </div>
  );
}
