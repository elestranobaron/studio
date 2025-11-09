
'use client';

import React from 'react';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';
import { ArrowRight, ChevronRight } from 'lucide-react';

// --- Type Definitions ---
type LineType = 'title' | 'exercise' | 'instruction' | 'rounds_header' | 'note' | 'empty';
type ParsedLine = { type: LineType; content: string; original: string };

// --- Helper Functions for Text Analysis & Formatting ---
const SECTION_KEYWORDS = ["WARM-UP", "WARMUP", "STRENGTH", "METCON", "CONDITIONING", "ACCESSORY", "COOL-DOWN", "GYMNASTICS", "SKILL", "TECHNIQUE", "PREP", "PLYOMÉTRIE", "HYBRID METCON"];
const ROUNDS_KEYWORDS = /^\s*(\d+\s*rounds?|for\s+\d+\s*rounds?|alternate|emom|every|for time)/i;
const EXERCISE_MARKER = /^\s*(-|\*|\d{1,2}[a-zA-Z]?\s?x|\d{1,3}[.-]\d{1,3}|\d+\/\d+)/;
const NOTE_KEYWORDS = /^(int|sc|intermédiaire|scale|beginner|débutant|rx|elite|part \d+)\b.*:?/i;
const toTitleCase = (str: string) => {
    if (!str) return '';
    // Don't modify mixed-case strings, only full uppercase ones
    if (str.toUpperCase() !== str) return str;
    return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());
};

const classifyLine = (line: string): ParsedLine => {
    const trimmed = line.trim();
    if (!trimmed) return { type: 'empty', content: '', original: line };
    const upper = trimmed.toUpperCase();

    if (NOTE_KEYWORDS.test(trimmed)) {
        return { type: 'note', content: trimmed.replace(/:\s*$/, ''), original: line };
    }
    if (SECTION_KEYWORDS.some(keyword => upper.startsWith(keyword)) && trimmed.split(' ').length < 5) {
      return { type: 'title', content: toTitleCase(trimmed.replace(':', '')), original: line };
    }
    if (ROUNDS_KEYWORDS.test(trimmed)) {
      return { type: 'rounds_header', content: toTitleCase(trimmed), original: line };
    }
    if (EXERCISE_MARKER.test(trimmed) || upper.includes('+')) {
        return { type: 'exercise', content: toTitleCase(trimmed), original: line };
    }
    // Default to instruction for anything else that's not empty
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

    // Extract details in parentheses or brackets
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
    const parts = line.content.split(/\s*\/\/\s*|\s*\/\s*/).map(p => p.trim());
    return (
        <div className="pl-7 text-xs text-muted-foreground italic mt-1 flex items-center gap-2">
            {parts.map((part, index) => (
                <React.Fragment key={index}>
                    {toTitleCase(part)}
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
        // Render a small gap for intentional empty lines to separate logical blocks
        return (index > 0 && lines[index - 1].type !== 'empty') ? <div key={index} className="h-2"></div> : null;
      default:
        return null;
    }
  };

  const blocks: JSX.Element[][] = [];
  let currentBlock: JSX.Element[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const prevLine = i > 0 ? lines[i-1] : null;

    if (line.type === 'rounds_header') {
      if (currentBlock.length > 0) blocks.push(currentBlock);
      currentBlock = [renderLine(line, i)!];
    } else if (line.type === 'exercise' || line.type === 'note') {
       if(prevLine && prevLine.type !== 'rounds_header' && prevLine.type !== 'exercise' && prevLine.type !== 'note') {
          if (currentBlock.length > 0) blocks.push(currentBlock);
          currentBlock = [];
       }
       currentBlock.push(renderLine(line, i)!);
    } else {
        if (currentBlock.length > 0) blocks.push(currentBlock);
        blocks.push([renderLine(line,i)!]);
        currentBlock = [];
    }
  }
  if (currentBlock.length > 0) blocks.push(currentBlock);


  return (
    <div className="space-y-3 text-base">
      {blocks.map((block, index) => {
        if (block.length === 0 || block.every(item => item === null)) return null;
        
        const isExerciseBlock = block.some(item => item?.props?.line?.type === 'exercise' || item?.props?.line?.type === 'rounds_header');
        
        if (isExerciseBlock) {
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
