"use client";

import React from "react";
import { format } from "date-fns";
import { Label } from "@/components/ui/label";

interface MeetingConclusionViewerProps {
  conclusion: {
    conclusion_notes: string;
    recorded_at: string;
  };
}

export default function MeetingConclusionViewer({ conclusion }: MeetingConclusionViewerProps) {
  return (
    <div className="space-y-4 py-4">
      <p className="text-sm text-muted-foreground">
        Recorded on: {format(new Date(conclusion.recorded_at), "PPP 'at' HH:mm")}
      </p>
      <div className="border rounded-lg p-4 bg-muted/50">
        <p className="whitespace-pre-wrap">{conclusion.conclusion_notes}</p>
      </div>
    </div>
  );
}