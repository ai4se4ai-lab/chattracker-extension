import axios, { AxiosInstance } from 'axios';
import { ConfigManager } from './configManager';
import { ChatSummary, ApiRequest } from './types';
import * as vscode from 'vscode';

export class ApiClient {
    private configManager: ConfigManager;
    private axiosInstance: AxiosInstance;

    constructor(configManager: ConfigManager) {
        this.configManager = configManager;
        this.axiosInstance = axios.create({
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }

    public async sendSummary(summary: ChatSummary): Promise<void> {
        const config = this.configManager.getConfig();

        if (!config.CURSOR_CONNECTION_CODE || !config.EASYITI_API_URL) {
            throw new Error('API configuration is missing. Please configure CURSOR_CONNECTION_CODE and EASYITI_API_URL in config.json');
        }

        const request: ApiRequest = {
            connectionCode: config.CURSOR_CONNECTION_CODE,
            summary: summary
        };

        try {
            const response = await this.axiosInstance.post(config.EASYITI_API_URL, request);
            console.log('Summary sent successfully:', response.status);
        } catch (error: any) {
            if (error.response) {
                throw new Error(`API Error: ${error.response.status} - ${error.response.data?.message || error.response.statusText}`);
            } else if (error.request) {
                throw new Error('Network Error: Could not reach the API server');
            } else {
                throw new Error(`Request Error: ${error.message}`);
            }
        }
    }

    public async testConnection(): Promise<boolean> {
        const config = this.configManager.getConfig();

        if (!config.CURSOR_CONNECTION_CODE || !config.EASYITI_API_URL) {
            return false;
        }

        try {
            // Try a simple GET request to check if the endpoint is reachable
            await this.axiosInstance.get(config.EASYITI_API_URL, { timeout: 5000 });
            return true;
        } catch (error: any) {
            // Even if it fails, if we got a response, the endpoint exists
            return error.response !== undefined;
        }
    }
}

