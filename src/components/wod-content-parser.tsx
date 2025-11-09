'use client';

import React from 'react';

type WodContentParserProps = {
  content: string;
};

// This component takes a raw WOD description string and formats it for better readability.
export function WodContentParser({ content }: WodContentParserProps) {
  const lines = content.split('\n').filter(line => line.trim() !== '');

  return (
    <div className="space-y-2 text-base">
      {lines.map((line, index) => {
        // Match lines that are just reps (e.g., "21-15-9 reps of:")
        if (/^(\d+(-\d+)*)\s+reps/i.test(line)) {
          return (
            <p key={index} className="text-foreground">
              <span className="font-bold text-primary text-lg">{line.match(/^(\d+(-\d+)*)/)?.[0]}</span>
              {line.replace(/^(\d+(-\d+)*)/, '')}
            </p>
          );
        }

        // Match lines that start with a dash (likely an exercise)
        if (line.trim().startsWith('-')) {
          const exerciseText = line.replace('-', '').trim();
          // Extract weight/note in parentheses
          const weightMatch = exerciseText.match(/\(([^)]+)\)/);
          const exerciseName = weightMatch ? exerciseText.replace(weightMatch[0], '').trim() : exerciseText;
          
          return (
            <div key={index} className="flex items-center gap-2 pl-4">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              <p className="flex-1 font-medium text-foreground">
                {exerciseName}
                {weightMatch && (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    {weightMatch[0]}
                  </span>
                )}
              </p>
            </div>
          );
        }

        // Default line rendering
        return (
          <p key={index} className="text-muted-foreground">
            {line}
          </p>
        );
      })}
    </div>
  );
}
