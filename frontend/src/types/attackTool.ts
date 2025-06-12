export interface ToolParameter {
  label: string;
  type: string;
  default?: string;
  description?: string;
  options?: string[];
}

export interface AttackVariant {
  id: string;
  name: string;
  description: string;
  command: (paramValues: Record<string, string>) => string;
  parameters: Record<string, ToolParameter>;
}

export interface AttackTool {
  id: string;
  name: string;
  description: string;
  category: string;
  parameters: Record<string, ToolParameter>;
  attacks: AttackVariant[];
} 