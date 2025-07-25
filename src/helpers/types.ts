export interface Message {
  id: number;
  from: string;
  text: string;
  timestamp: number;
  isFromMe: boolean;
  chatId: number;
}

export interface Chat {
  id: number;
  name: string;
  participants: string[];
  lastMessageDate: number;
}
