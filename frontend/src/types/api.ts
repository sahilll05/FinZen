export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  size: number;
}

export interface SimulationResult {
  median_return: number;
  p10_return: number;
  p90_return: number;
  simulations: Array<Array<{ step: number; value: number }>>;
}

export interface CitedSource {
  title: string;
  source: string;
  date: string;
  url: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  sources?: CitedSource[];
  context_used?: boolean;
}

export interface GraphNode {
  id: string;
  label: string;
  type: 'company' | 'sector' | 'country' | 'regulatory';
}

export interface GraphEdge {
  source: string;
  target: string;
  label: string;
}
