
'use client';

import React from 'react';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';

// Keywords that indicate a line is a title for a new section.
const SECTION_KEYWORDS = ["WARM-UP", "WARMUP", "STRENGTH", "METCON", "CONDITIONING", "ACCESSORY", "COOL-DOWN", "GYMNASTICS", "SKILL", "TECHNIQUE", "PREP"];
const EXERCISE_MARKERS = /^\s*(-|\*|\d+(\s?x|\s))|^\d+-\d+/; // Starts with -, *, "10 x", "10 ", or "21-15-9"
const SEQUENCE_KEYWORD = /directly|then/i;

// --- Helper Functions for Text Formatting ---

// Converts a string to Title Case, e.g., "WARM-UP" -> "Warm-Up"
const toTitleCase = (str: string) => {
    return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());
};

// Converts a string to Sentence case, handling multiple sentences.
const toSentenceCase = (str: string) => {
    if (!str) return '';
    const lower = str.toLowerCase();
    // Capitalize the first letter of the string and after each sentence-ending punctuation.
    return lower.replace(/(^\s*\w|[.!?]\s*\w)/g, (c) => c.toUpperCase());
};

// --- Helper Components for Styling ---

const DetailBadge: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <Badge variant="secondary" className="text-xs font-medium ml-2">{children}</Badge>
);

const InstructionText: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <p className="text-sm text-muted-foreground italic pl-4 border-l-2 border-muted ml-2 py-1">{children}</p>
);

// --- Main Parser Logic ---

type LineType = 'title' | 'exercise' | 'reps' | 'instruction';
type ParsedLine = { type: LineType; content: string; original: string };

function parseContent(content: string): ParsedLine[][] {
  const lines = content.split('\n').filter(line => line.trim() !== '');
  
  if (lines.length === 0) return [];

  const parsedLines: ParsedLine[] = lines.map(line => {
    const trimmed = line.trim();
    const upper = trimmed.toUpperCase();
    
    if (SECTION_KEYWORDS.some(keyword => upper.startsWith(keyword)) && trimmed.split(' ').length < 5) {
        return { type: 'title', content: toTitleCase(trimmed.replace(':', '')), original: line };
    }
    if (/^(\d+(-\d+)*)\s+reps/i.test(trimmed)) {
        return { type: 'reps', content: trimmed, original: line };
    }
    if (EXERCISE_MARKERS.test(trimmed)) {
        return { type: 'exercise', content: trimmed, original: line };
    }
    return { type: 'instruction', content: toSentenceCase(trimmed), original: line };
  });

  // Group consecutive instructions together
  const groupedLines: ParsedLine[][] = [];
  let currentGroup: ParsedLine[] = [];

  for (const line of parsedLines) {
    if (line.type !== 'instruction') {
        if (currentGroup.length > 0) {
            groupedLines.push(currentGroup);
            currentGroup = [];
        }
        groupedLines.push([line]);
    } else {
        currentGroup.push(line);
    }
  }
  if (currentGroup.length > 0) {
      groupedLines.push(currentGroup);
  }

  return groupedLines;
}

const renderLine = (line: ParsedLine) => {
    let text = line.content.replace(/^-|\*/, '').trim();
    const details = text.match(/\(([^)]+)\)|\[([^\]]+)\]/g) || [];
    text = text.replace(/\(([^)]+)\)|\[([^\]]+)\]/g, '').trim();

    // Check for sequence keywords
    const hasSequenceKeyword = SEQUENCE_KEYWORD.test(text);
    if(hasSequenceKeyword) {
        text = text.replace(SEQUENCE_KEYWORD, '').trim();
    }
    
    return (
        <div className={cn("flex items-start gap-3 pl-2", hasSequenceKeyword && "mt-1")}>
            <span className={cn(
                "h-1.5 w-1.5 rounded-full bg-primary mt-[0.6rem] flex-shrink-0",
                hasSequenceKeyword && "opacity-50"
            )} />
            <p className="flex-1 text-foreground leading-relaxed">
                {toSentenceCase(text)}
                {details.map((detail, i) => (
                    <DetailBadge key={i}>{detail.replace(/[()\[\]]/g, '')}</DetailBadge>
                ))}
            </p>
        </div>
    );
};


export function WodContentParser({ content }: { content: string }) {
  const groupedContent = parseContent(content);

  return (
    <div className="space-y-4 text-base">
      {groupedContent.map((group, groupIndex) => {
        const firstLine = group[0];

        if (firstLine.type === 'title') {
          return (
            <h4 key={groupIndex} className="font-headline text-lg text-foreground pt-3 first:pt-0">
              {firstLine.content}
            </h4>
          );
        }

        if (firstLine.type === 'reps') {
            const match = firstLine.content.match(/^(\d+(-\d+)*)/);
            const reps = match ? match[0] : '';
            const restOfLine = match ? firstLine.content.replace(match[0], '').trim() : firstLine.content;
            return (
                <p key={groupIndex} className="text-foreground">
                    <span className="font-bold text-primary text-lg">{reps}</span>
                    {` ${toSentenceCase(restOfLine)}`}
                </p>
            );
        }

        if (firstLine.type === 'instruction') {
            return (
                <InstructionText key={groupIndex}>
                    {group.map(line => line.content).join(' ')}
                </InstructionText>
            );
        }

        // It's a group of exercises
        return (
          <div key={groupIndex} className="space-y-2">
            {group.map((line, lineIndex) => renderLine(line))}
          </div>
        );

      })}
    </div>
  );
}
