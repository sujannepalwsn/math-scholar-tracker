import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useMutation } from "@tanstack/react-query";
import { Brain, Loader2, TrendingUp, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function AIInsights() {
  const [insights, setInsights] = useState<any>(null);

  const generateInsightsMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("ai-generate-insights");
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setInsights(data);
      toast.success("AI insights generated successfully");
    },
    onError: (error: any) => {
      console.error("Error generating insights:", error);
      if (error.message?.includes("429")) {
        toast.error("Rate limit exceeded. Please try again in a few moments.");
      } else if (error.message?.includes("402")) {
        toast.error("AI credits depleted. Please add funds to your workspace.");
      } else {
        toast.error("Failed to generate insights");
      }
    },
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight">AI Insights Portal</h1>
          <p className="text-muted-foreground text-lg">
            Smart analysis of student performance and behavioral trends.
          </p>
        </div>
        <Button
          size="lg"
          className="rounded-2xl shadow-medium h-14 px-8 text-base font-bold"
          onClick={() => generateInsightsMutation.mutate()}
          disabled={generateInsightsMutation.isPending}
        >
          {generateInsightsMutation.isPending ? (
            <>
              <Loader2 className="mr-3 h-5 w-5 animate-spin" />
              Processing Data...
            </>
          ) : (
            <>
              <Brain className="mr-3 h-5 w-5" />
              Generate Smart Insights
            </>
          )}
        </Button>
      </div>

      {!insights && !generateInsightsMutation.isPending && (
        <Alert>
          <Brain className="h-4 w-4" />
          <AlertDescription>
            Click "Generate AI Insights" to analyze student performance data and receive
            personalized recommendations for your class.
          </AlertDescription>
        </Alert>
      )}

      {insights && (
        <>
          {/* Overall Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Overall Class Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground leading-relaxed">{insights.overallInsights}</p>
            </CardContent>
          </Card>

          {/* Students Needing Attention */}
          {insights.studentsNeedingAttention && insights.studentsNeedingAttention.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-500" />
                  Students Needing Attention
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {insights.studentsNeedingAttention.map((student: any, idx: number) => (
                    <div key={idx} className="border rounded-lg p-4 space-y-2">
                      <h3 className="font-semibold text-lg">{student.name}</h3>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Issues:</p>
                        <ul className="list-disc list-inside space-y-1">
                          {student.issues.map((issue: string, i: number) => (
                            <li key={i} className="text-sm">{issue}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">
                          Recommendations:
                        </p>
                        <p className="text-sm">{student.recommendations}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* High Performers */}
          {insights.highPerformers && insights.highPerformers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-green-500" />
                  High Performers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {insights.highPerformers.map((name: string, idx: number) => (
                    <span
                      key={idx}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Common Challenges */}
          {insights.commonChallenges && insights.commonChallenges.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Common Challenges</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {insights.commonChallenges.map((challenge: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>{challenge}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Actionable Recommendations */}
          {insights.actionableRecommendations && insights.actionableRecommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Actionable Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {insights.actionableRecommendations.map((rec: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-primary mt-1">✓</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
