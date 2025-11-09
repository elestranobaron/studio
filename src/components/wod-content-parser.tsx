
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
const SECTION_KEYWORDS = ["WARM-UP", "WARMUP", "STRENGTH", "METCON", "CONDITIONING", "ACCESSORY", "COOL-DOWN", "GYMNASTICS", "SKILL", "TECHNIQUE", "PREP", "PLYOMÉTRIE"];
const ROUNDS_KEYWORDS = /\d+\s+(rounds?|series)/i;
const EXERCISE_MARKER = /^\s*(-|\*|\d+(\s?x|\s)|\d+-\d+)/;
const NOTE_KEYWORDS = /^(int|sc|intermédiaire|scale|beginner|débutant)\s?:/i;
const SEQUENCE_KEYWORD = /directly|then|alterner|alternate/i;
const toTitleCase = (str: string) => str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());
const toSentenceCase = (str: string) => !str ? '' : str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

// --- Main Parsing Logic ---
function parseContentToBlocks(content: string): ParsedBlock[] {
  const lines = content.split('\n').filter(line => line.trim() !== '');
  if (!lines.length) return [];

  const parsedLines: ParsedLine[] = lines.map(line => {
    const trimmed = line.trim();
    const upper = trimmed.toUpperCase();
    
    if (SECTION_KEYWORDS.some(keyword => upper.startsWith(keyword)) && trimmed.split(' ').length < 5) {
      return { type: 'title', content: toTitleCase(trimmed.replace(':', '')), original: line };
    }
    if (ROUNDS_KEYWORDS.test(trimmed)) {
      return { type: 'rounds_header', content: trimmed, original: line };
    }
    if (NOTE_KEYWORDS.test(trimmed)) {
        return { type: 'note', content: trimmed, original: line };
    }
    if (EXERCISE_MARKER.test(trimmed)) {
      return { type: 'exercise', content: trimmed, original: line };
    }
    return { type: 'instruction', content: trimmed, original: line };
  });

  const blocks: ParsedBlock[] = [];
  let i = 0;
  while (i < parsedLines.length) {
    const currentLine = parsedLines[i];
    
    if (currentLine.type === 'title') {
      blocks.push({ type: 'title', lines: [currentLine] });
      i++;
    } else if (currentLine.type === 'rounds_header' || currentLine.type === 'exercise') {
      const exerciseBlock: ParsedLine[] = [];
      while (i < parsedLines.length && (parsedLines[i].type === 'rounds_header' || parsedLines[i].type === 'exercise' || parsedLines[i].type === 'note')) {
        exerciseBlock.push(parsedLines[i]);
        i++;
      }
      blocks.push({ type: 'exercise_block', lines: exerciseBlock });
    } else { // instruction
        const instructionBlock: ParsedLine[] = [];
        while(i < parsedLines.length && parsedLines[i].type === 'instruction') {
            instructionBlock.push(parsedLines[i]);
            i++;
        }
        blocks.push({type: 'instruction_block', lines: instructionBlock});
    }
  }

  return blocks;
}

// --- Rendering Components ---

const DetailBadge: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Badge variant="secondary" className="text-xs font-medium ml-2">{children}</Badge>
);

const InstructionText: React.FC<{ lines: ParsedLine[] }> = ({ lines }) => (
    <p className="text-sm text-muted-foreground italic pl-4 border-l-2 border-muted ml-2 py-1">
        {lines.map(l => l.content).join(' ')}
    </p>
);

const RenderExerciseLine: React.FC<{ line: ParsedLine }> = ({ line }) => {
  let text = line.content.replace(/^-|\*/, '').trim();
  const details = text.match(/\(([^)]+)\)|\[([^\]]+)\]/g) || [];
  text = text.replace(/\(([^)]+)\)|\[([^\]]+)\]/g, '').trim();

  const hasSequenceKeyword = SEQUENCE_KEYWORD.test(text);
  if (hasSequenceKeyword) {
    text = text.replace(SEQUENCE_KEYWORD, '').trim();
  }
  
  return (
    <div className={cn("flex items-start gap-3 pl-2", hasSequenceKeyword && "mt-1")}>
      <span className={cn("h-1.5 w-1.5 rounded-full bg-primary mt-[0.5rem] flex-shrink-0", hasSequenceKeyword && "opacity-50")} />
      <p className="flex-1 text-foreground leading-snug">
        {toSentenceCase(text)}
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
        {toSentenceCase(line.content)}
    </p>
);

const ExerciseBlock: React.FC<{ lines: ParsedLine[] }> = ({ lines }) => (
    <div className="p-4 rounded-lg bg-card border border-border/50 space-y-2">
        {lines.map((line, index) => {
            if (line.type === 'rounds_header') return <RenderRoundsHeader key={index} line={line} />;
            if (line.type === 'exercise') return <RenderExerciseLine key={index} line={line} />;
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
