import api from "./client";

export interface AiChatResponse {
  response: string;
}

export async function sendAiChatMessage(message: string): Promise<AiChatResponse> {
  const res = await api.post<AiChatResponse>("/ai/chat/", { message });
  return res.data;
}
