'use client';

import React from 'react';

type WodContentParserProps = {
  content: string;
};

// Helper to convert a string to Title Case
const toTitleCase = (str: string) => {
    return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());
};

// Helper to convert a string to Sentence case
const toSentenceCase = (str: string) => {
    const lower = str.toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
};


// Keywords for section titles
const SECTION_KEYWORDS = ["WARM-UP", "WARMUP", "STRENGTH", "METCON", "CONDITIONING", "ACCESSORY", "COOL-DOWN", "GYMNASTICS", "SKILL"];

// This component takes a raw WOD description string and formats it for better readability.
export function WodContentParser({ content }: WodContentParserProps) {
  const lines = content.split('\n').filter(line => line.trim() !== '');

  return (
    <div className="space-y-3 text-base">
      {lines.map((line, index) => {
        const trimmedLine = line.trim();

        // 1. Check for Section Titles (e.g., "METCON", "STRENGTH")
        const isSectionTitle = SECTION_KEYWORDS.some(keyword => trimmedLine.toUpperCase().includes(keyword)) && trimmedLine.split(' ').length < 4;
        if (isSectionTitle) {
            return (
                <h4 key={index} className="font-headline text-lg text-foreground pt-2">
                    {toTitleCase(trimmedLine)}
                </h4>
            );
        }

        // 2. Match lines that are just reps (e.g., "21-15-9 reps of:")
        if (/^(\d+(-\d+)*)\s+reps/i.test(trimmedLine)) {
          return (
            <p key={index} className="text-foreground">
              <span className="font-bold text-primary text-lg">{trimmedLine.match(/^(\d+(-\d+)*)/)?.[0]}</span>
              {toSentenceCase(trimmedLine.replace(/^(\d+(-\d+)*)/, ''))}
            </p>
          );
        }

        // 3. Match lines that start with a dash (likely an exercise)
        if (trimmedLine.startsWith('-')) {
          const exerciseText = trimmedLine.replace('-', '').trim();
          // Extract weight/note in parentheses
          const weightMatch = exerciseText.match(/\(([^)]+)\)/);
          const exerciseName = weightMatch ? exerciseText.replace(weightMatch[0], '').trim() : exerciseText;
          
          return (
            <div key={index} className="flex items-center gap-2 pl-4">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              <p className="flex-1 font-medium text-foreground">
                {toSentenceCase(exerciseName)}
                {weightMatch && (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    {weightMatch[0]}
                  </span>
                )}
              </p>
            </div>
          );
        }
        
        // 4. Default line rendering (for instructions, etc.)
        return (
          <p key={index} className="text-muted-foreground">
            {toSentenceCase(trimmedLine)}
          </p>
        );
      })}
    </div>
  );
}
