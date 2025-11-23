"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Loader2, Sparkles, TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "~/components/ui/chart";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  Cell,
} from "recharts";

interface AnalysisResult {
  graphs: {
    type: "bar" | "line" | "pie" | "area";
    title: string;
    description?: string;
    data: Record<string, unknown>[];
    config: {
      xAxisKey?: string;
      yAxisKey?: string;
      nameKey?: string;
      dataKey?: string;
      color?: string;
    };
  }[];
  numbers: {
    label: string;
    value: number;
    suffix?: string;
    trend?: "up" | "down" | "neutral";
    type?: string; // for backward compatibility with old format
  }[];
  texts: (
    | string
    | {
        label?: string;
        value: string;
        type?: string;
      }
  )[];
}

interface AIAnalysisDialogProps {
  formStructure: Record<string, unknown>;
  csvData?: string;
  getCSVData?: () => Promise<string>;
  trigger?: React.ReactNode;
}

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#ff7c7c",
];

export function AIAnalysisDialog({
  formStructure,
  csvData,
  getCSVData,
  trigger,
}: AIAnalysisDialogProps) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const handleAnalyze = async () => {
    if (!question.trim()) {
      toast.error("Please enter a question");
      return;
    }

    setLoading(true);
    try {
      // Get CSV data either from prop or function
      let csv = csvData;
      if (!csv && getCSVData) {
        csv = await getCSVData();
      }

      if (!csv) {
        throw new Error("No data available to analyze");
      }

      // Append form structure context to the question to help AI understand field names
      const enhancedQuestion = `${question.trim()}\n\nForm structure: ${JSON.stringify(formStructure)}`;

      const response = await fetch(
        "https://ai-services-production-c89a.up.railway.app/analyze",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            question: enhancedQuestion,
            csv_data: csv,
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error Response:", errorText);
        throw new Error(
          `API returned ${response.status}: ${response.statusText}`,
        );
      }

      const data = (await response.json()) as AnalysisResult;
      setResult(data);
      toast.success("Analysis complete!");
    } catch (error) {
      console.error("Analysis error:", error);

      // Check if it's a network/CORS error
      if (error instanceof TypeError && error.message.includes("fetch")) {
        toast.error(
          "Cannot connect to AI service. This may be a CORS issue. Please check the backend configuration.",
        );
      } else if (error instanceof Error) {
        toast.error(`Analysis failed: ${error.message}`);
      } else {
        toast.error("Failed to analyze data. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const renderChart = (graph: AnalysisResult["graphs"][0], index: number) => {
    // Create a simple chart config for the ChartContainer
    const chartConfig = {
      value: {
        label: graph.config.yAxisKey ?? "Value",
        color: graph.config.color ?? COLORS[index % COLORS.length],
      },
    } satisfies ChartConfig;

    switch (graph.type) {
      case "bar":
        return (
          <ChartContainer config={chartConfig}>
            <BarChart data={graph.data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey={graph.config.xAxisKey ?? "name"}
                className="text-xs"
              />
              <YAxis className="text-xs" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar
                dataKey={graph.config.yAxisKey ?? "value"}
                fill={graph.config.color ?? COLORS[index % COLORS.length]}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        );

      case "line":
        return (
          <ChartContainer config={chartConfig}>
            <LineChart data={graph.data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey={graph.config.xAxisKey ?? "name"}
                className="text-xs"
              />
              <YAxis className="text-xs" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                type="monotone"
                dataKey={graph.config.yAxisKey ?? "value"}
                stroke={graph.config.color ?? COLORS[index % COLORS.length]}
                strokeWidth={2}
                dot={{
                  fill: graph.config.color ?? COLORS[index % COLORS.length],
                }}
              />
            </LineChart>
          </ChartContainer>
        );

      case "pie":
        return (
          <ChartContainer config={chartConfig}>
            <PieChart>
              <Pie
                data={graph.data}
                dataKey={graph.config.dataKey ?? "value"}
                nameKey={graph.config.nameKey ?? "name"}
                cx="50%"
                cy="50%"
                outerRadius={80}
                label
              >
                {graph.data.map((entry, idx) => (
                  <Cell
                    key={`cell-${idx}`}
                    fill={
                      (entry.fill as string | undefined) ??
                      COLORS[idx % COLORS.length]
                    }
                  />
                ))}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend />
            </PieChart>
          </ChartContainer>
        );

      case "area":
        return (
          <ChartContainer config={chartConfig}>
            <AreaChart data={graph.data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey={graph.config.xAxisKey ?? "name"}
                className="text-xs"
              />
              <YAxis className="text-xs" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey={graph.config.yAxisKey ?? "value"}
                fill={graph.config.color ?? COLORS[index % COLORS.length]}
                stroke={graph.config.color ?? COLORS[index % COLORS.length]}
                fillOpacity={0.6}
              />
            </AreaChart>
          </ChartContainer>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" className="gap-2">
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">Analyze with AI</span>
            <span className="sm:hidden">AI Analysis</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-[95vw] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Response Analysis
          </DialogTitle>
          <DialogDescription>
            Ask questions about your form responses and get instant insights
            with visualizations.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Input Section */}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              placeholder="e.g., What is the average rating? Show distribution by category..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !loading) {
                  void handleAnalyze();
                }
              }}
              className="flex-1"
              disabled={loading}
            />
            <Button
              onClick={handleAnalyze}
              disabled={loading || !question.trim()}
              className="w-full sm:w-auto"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Analyze
                </>
              )}
            </Button>
          </div>

          {/* Results Section */}
          {result && (
            <div className="space-y-4">
              {/* Number Blocks */}
              {result.numbers.length > 0 && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {result.numbers.map((num, idx) => (
                    <Card key={idx} className="relative overflow-hidden">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-muted-foreground text-sm font-medium">
                          {num.label}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-bold sm:text-3xl">
                              {num.value.toLocaleString()}
                            </span>
                            {num.suffix && (
                              <span className="text-muted-foreground text-sm">
                                {num.suffix}
                              </span>
                            )}
                          </div>
                          {num.trend && num.trend !== "neutral" && (
                            <div
                              className={`rounded-full p-1 ${
                                num.trend === "up"
                                  ? "bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400"
                                  : "bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400"
                              }`}
                            >
                              {num.trend === "up" ? (
                                <TrendingUp className="h-4 w-4" />
                              ) : (
                                <TrendingDown className="h-4 w-4" />
                              )}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Text Insights */}
              {result.texts.length > 0 && (
                <div className="space-y-2">
                  {result.texts.map((text, idx) => {
                    const textContent =
                      typeof text === "string" ? text : text.value;
                    return (
                      <Card key={idx} className="border-l-primary border-l-4">
                        <CardContent className="p-3 sm:p-4">
                          <p className="text-sm leading-relaxed">
                            {textContent}
                          </p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              {/* Charts */}
              {result.graphs.length > 0 && (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {result.graphs.map((graph, idx) => (
                    <Card key={idx}>
                      <CardHeader>
                        <CardTitle className="text-base sm:text-lg">
                          {graph.title}
                        </CardTitle>
                        {graph.description && (
                          <p className="text-muted-foreground text-sm">
                            {graph.description}
                          </p>
                        )}
                      </CardHeader>
                      <CardContent className="p-2 sm:p-6">
                        <div className="h-[300px] w-full">
                          {renderChart(graph, idx)}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Empty State */}
              {result.numbers.length === 0 &&
                result.texts.length === 0 &&
                result.graphs.length === 0 && (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12">
                      <Sparkles className="text-muted-foreground mb-4 h-12 w-12 opacity-50" />
                      <p className="text-muted-foreground text-center text-sm">
                        No insights generated. Try asking a different question.
                      </p>
                    </CardContent>
                  </Card>
                )}
            </div>
          )}

          {/* Initial State */}
          {!result && !loading && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-8 text-center sm:py-12">
                <Sparkles className="text-muted-foreground mb-4 h-12 w-12 opacity-50" />
                <p className="mb-2 text-sm font-medium">
                  Ask a question to get started
                </p>
                <p className="text-muted-foreground text-xs sm:text-sm">
                  Try questions like &quot;What is the average rating?&quot; or
                  &quot;Show me the distribution of responses&quot;
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
