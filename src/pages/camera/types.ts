// Define interfaces for analysis results
export interface AnalysisResult {
  status: string;
  text: string;
  analysis: {
    summary: string;
    key_points: string[];
    entities: string[];
    sentiment: string;
    topics: string[];
  };
  word_count: number;
}
