
'use client';

import React from 'react';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';

// --- Type Definitions ---
type LineType = 'title' | 'exercise' | 'instruction' | 'rounds_header' | 'note';
type ParsedLine = { type: LineType; content: string; original: string };
type ParsedBlock = {
  type: 'title' | 'instruction_block' | 'exercise_block';
  lines: ParsedLine[];
};

// --- Helper Functions for Text Analysis & Formatting ---
const SECTION_KEYWORDS = ["WARM-UP", "WARMUP", "STRENGTH", "METCON", "CONDITIONING", "ACCESSORY", "COOL-DOWN", "GYMNASTICS", "SKILL", "TECHNIQUE", "PREP", "PLYOMÉTRIE", "HYBRID METCON"];
const ROUNDS_KEYWORDS = /^\s*(\d+|for)\s+(rounds?|series|round of)/i;
const EXERCISE_MARKER = /^\s*(-|\*|\d+(\s?x|\s)|\d+-\d+)/;
const COMPLEX_EXERCISE_MARKER = /\+|[a-zA-Z]+\s\+/;
const NOTE_KEYWORDS = /^(int|sc|intermédiaire|scale|beginner|débutant|rx|elite|part \d)\b.*:/i;
const INSTRUCTION_KEYWORDS = /every|alternate|then|for time/i;
const toTitleCase = (str: string) => str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());

const classifyLine = (line: string): ParsedLine => {
    const trimmed = line.trim();
    if (!trimmed) return { type: 'instruction', content: '', original: line };
    const upper = trimmed.toUpperCase();

    if (NOTE_KEYWORDS.test(trimmed)) {
        return { type: 'note', content: trimmed, original: line };
    }
    if (SECTION_KEYWORDS.some(keyword => upper.startsWith(keyword)) && trimmed.split(' ').length < 5) {
      return { type: 'title', content: toTitleCase(trimmed.replace(':', '')), original: line };
    }
    if (ROUNDS_KEYWORDS.test(trimmed)) {
      return { type: 'rounds_header', content: trimmed, original: line };
    }
    if (EXERCISE_MARKER.test(trimmed) || COMPLEX_EXERCISE_MARKER.test(trimmed)) {
        return { type: 'exercise', content: toTitleCase(trimmed), original: line };
    }
    if (INSTRUCTION_KEYWORDS.test(trimmed)) {
        return { type: 'instruction', content: trimmed, original: line };
    }
    // Default to exercise if it's not an empty line to make it white
    return { type: 'exercise', content: toTitleCase(trimmed), original: line };
};

function parseContentToBlocks(content: string): ParsedBlock[] {
  const lines = content.split('\n');
  if (!lines.length) return [];

  const parsedLines: ParsedLine[] = lines.map(classifyLine);

  const blocks: ParsedBlock[] = [];
  let i = 0;
  while (i < parsedLines.length) {
    const currentLine = parsedLines[i];
    if (currentLine.content === '') {
        i++;
        continue;
    }
    
    if (currentLine.type === 'title') {
      blocks.push({ type: 'title', lines: [currentLine] });
      i++;
    } else if (currentLine.type === 'rounds_header') {
        const exerciseBlock: ParsedLine[] = [currentLine];
        i++;
        while (i < parsedLines.length && (parsedLines[i].type === 'exercise' || parsedLines[i].type === 'note' || parsedLines[i].content === '')) {
            if (parsedLines[i].content !== '') exerciseBlock.push(parsedLines[i]);
            i++;
        }
        blocks.push({ type: 'exercise_block', lines: exerciseBlock });
    } else { 
        const otherBlock: ParsedLine[] = [currentLine];
        i++;
         while (i < parsedLines.length && parsedLines[i].type !== 'title' && parsedLines[i].type !== 'rounds_header' && parsedLines[i].content !== '') {
            otherBlock.push(parsedLines[i]);
            i++;
        }
        const blockType = otherBlock.some(l => l.type === 'exercise' || l.type === 'instruction') ? 'exercise_block' : 'instruction_block';
        blocks.push({ type: blockType, lines: otherBlock });
    }
  }
  return blocks;
}

// --- Rendering Components ---

const DetailBadge: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Badge variant="secondary" className="text-xs font-medium ml-2">{children}</Badge>
);

const InstructionText: React.FC<{ lines: ParsedLine[] }> = ({ lines }) => (
    <p className="text-sm text-foreground pl-4 border-l-2 border-muted ml-2 py-1">
        {lines.map(l => l.content).join(' ')}
    </p>
);

const RenderExerciseLine: React.FC<{ line: ParsedLine }> = ({ line }) => {
  let text = line.content.replace(/^-|\*/, '').trim();
  const details = text.match(/\(([^)]+)\)|\[([^\]]+)\]/g) || [];
  text = text.replace(/\(([^)]+)\)|\[([^\]]+)\]/g, '').trim();

  const parts = text.split('+').map(p => p.trim());
  
  return (
    <div className={cn("flex items-start gap-3 pl-2")}>
      <span className={cn("h-1.5 w-1.5 rounded-full bg-primary mt-[0.5rem] flex-shrink-0")} />
      <p className="flex-1 text-foreground leading-snug">
        {parts.map((part, index) => (
            <React.Fragment key={index}>
                {part}
                {index < parts.length - 1 && <span className="text-primary font-bold mx-2">+</span>}
            </React.Fragment>
        ))}
        {details.map((detail, i) => <DetailBadge key={i}>{detail.replace(/[()\[\]]/g, '')}</DetailBadge>)}
      </p>
    </div>
  );
};

const RenderNoteLine: React.FC<{ line: ParsedLine }> = ({ line }) => {
    const parts = line.content.split('//').map(p => p.trim());
    return (
        <div className="pl-6 text-xs text-muted-foreground italic mt-1">
            {parts.join(' / ')}
        </div>
    );
};

const RenderRoundsHeader: React.FC<{ line: ParsedLine }> = ({ line }) => (
    <p className="font-semibold text-foreground flex items-center gap-2">
        <ArrowRight className="h-4 w-4 text-primary" />
        {line.content}
    </p>
);

const ExerciseBlock: React.FC<{ lines: ParsedLine[] }> = ({ lines }) => (
    <div className="p-4 rounded-lg bg-card border border-border/50 space-y-2">
        {lines.map((line, index) => {
            if (line.type === 'rounds_header') return <RenderRoundsHeader key={index} line={line} />;
            if (line.type === 'exercise') return <RenderExerciseLine key={index} line={line} />;
            if (line.type === 'instruction') return <InstructionText key={index} lines={[line]}/>;
            if (line.type === 'note') return <RenderNoteLine key={index} line={line} />;
            return null;
        })}
    </div>
);

export function WodContentParser({ content }: { content: string }) {
  const blocks = parseContentToBlocks(content);

  return (
    <div className="space-y-4 text-base">
      {blocks.map((block, blockIndex) => {
        switch (block.type) {
          case 'title':
            return (
              <h4 key={blockIndex} className="font-headline text-lg text-foreground pt-3 first:pt-0">
                {block.lines[0].content}
              </h4>
            );
          case 'exercise_block':
            return <ExerciseBlock key={blockIndex} lines={block.lines} />;
          case 'instruction_block':
            return <InstructionText key={blockIndex} lines={block.lines} />;
          default:
            return null;
        }
      })}
    </div>
  );
}

