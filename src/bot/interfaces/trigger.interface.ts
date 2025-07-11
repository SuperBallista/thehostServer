export interface BotTrigger {
  id: string;
  type: 'time' | 'chat' | 'radio';
  condition: TriggerCondition;
  priority: number;
  action: string;
  metadata?: {
    description: string;
  };
}

export interface TimeTriggerCondition {
  seconds: number;
  turnStart: boolean;
}

export interface ChatTriggerCondition {
  pattern: string;
  sender: 'any' | 'specific';
  senderId?: number;
}

export interface RadioTriggerCondition {
  sender: 'any' | 'specific';
  senderId?: number;
}

export type TriggerCondition = TimeTriggerCondition | ChatTriggerCondition | RadioTriggerCondition;

export interface TriggeredEvent {
  triggerId: string;
  triggerType: 'time' | 'chat' | 'radio';
  data: any;
  timestamp: Date;
}

export interface TriggerStorage {
  triggers: BotTrigger[];
  createdAt: string;
  turnNumber: number;
  personality: {
    mbti: string;
    gender: string;
  };
}