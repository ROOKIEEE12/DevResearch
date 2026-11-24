export type SourceType = 'web' | 'youtube' | 'papers' | 'reddit_hn' | 'github';

export type ResearchDepth = 'quick' | 'standard' | 'deep';

export interface SourceItem {
  id: string;
  citationId: number; // [1], [2], etc.
  type: SourceType;
  title: string;
  url: string;
  snippet: string;
  rawContent?: string; // Full/cleaned raw text collected by the research agent
  date?: string;
  author?: string;
  credibilityScore?: number; // 1-100
  metadata?: {
    stars?: number;
    citationCount?: number;
    channelTitle?: number | string;
    score?: number;
    subreddit?: string;
    journal?: string;
  };
}

export interface NLUAnalysis {
  intent: string;
  domain: string;
  problemType: 'debugging' | 'architecture' | 'comparison' | 'how-to' | 'deep-dive';
  entities: string[];
  researchAngles: string[];
  complexity: 'Low' | 'Medium' | 'High';
}

export interface SubQuery {
  id: string;
  sourceType: SourceType;
  query: string;
  purpose: string;
}

export interface ProsCons {
  approach: string;
  description: string;
  pros: string[];
  cons: string[];
  complexity: 'Low' | 'Medium' | 'High';
}

export interface ResearchBriefData {
  summary: string;
  approaches: ProsCons[];
  recommendedSolution: {
    title: string;
    rationale: string;
    tradeoffs: string;
    architectureNotes?: string;
  };
  codeSnippets: Array<{
    language: string;
    title: string;
    code: string;
    explanation: string;
  }>;
  keyPapersAndVideos: Array<{
    title: string;
    url: string;
    type: 'paper' | 'video' | 'discussion';
    takeaway: string;
    citationId: number;
  }>;
  openQuestions: string[];
}

export interface FollowUpMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  citedSources?: number[];
}

export interface ResearchSession {
  id: string;
  title: string;
  problem: string;
  depth: ResearchDepth;
  selectedSources: SourceType[];
  createdAt: string;
  status: 'idle' | 'nlu' | 'planning' | 'searching' | 'processing' | 'synthesizing' | 'completed' | 'error';
  nlu?: NLUAnalysis;
  subQueries: SubQuery[];
  sources: SourceItem[];
  brief?: ResearchBriefData;
  rawMarkdownBrief?: string;
  followUps: FollowUpMessage[];
  warnings?: string[];
  errors?: string[];
}

export interface PipelineStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'warning' | 'error';
  details?: string;
}

