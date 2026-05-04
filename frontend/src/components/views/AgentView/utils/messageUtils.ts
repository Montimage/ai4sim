let counter = 0;

export function generateUniqueMessageId(): string {
  counter += 1;
  return `msg-${Date.now()}-${counter}-${Math.random().toString(36).substr(2, 9)}`;
}
