import { SourceType } from '@/types/research';

export interface BaseSourceResult {
  title: string;
  url: string;
  snippet: string;
  source: SourceType;
  date?: string;
  author?: string;
  credibilityScore?: number;
  metadata?: {
    citationCount?: number;
    venue?: string;
    journal?: string;
    stars?: number;
    score?: number;
    channelTitle?: string;
    isOfficialDoc?: boolean;
    arxivId?: string;
    doi?: string;
    [key: string]: any;
  };
}

export interface ConnectorOptions {
  limit?: number;
  timeoutMs?: number;
  depth?: 'quick' | 'standard' | 'deep';
}

export interface SourceConnector {
  name: string;
  sourceType: SourceType;
  search(query: string, options?: ConnectorOptions): Promise<BaseSourceResult[]>;
}

export interface ConnectorExecutionResult {
  sourceType: SourceType;
  results: BaseSourceResult[];
  error?: string;
  durationMs: number;
}

