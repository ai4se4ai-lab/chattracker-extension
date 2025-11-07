export type TaskStatus = 'completed' | 'in-progress' | 'failed';

export interface ChatSummary {
    id: string;
    timestamp: string;
    userPrompt: string;
    userObjectives: string[];
    aiResponseSummary: string;
    mainActions: string[];
    modifiedFiles: string[];
    taskStatus: TaskStatus;
}

export interface ApiRequest {
    connectionCode: string;
    summary: ChatSummary;
}

