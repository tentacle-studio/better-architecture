import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import type { GameState, ServiceType, Position } from './types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
const WS_URL = `${API_BASE_URL}/ws`;

class GameApiService {
  private stompClient: Client | null = null;

  // Initialize WebSocket connection
  private initWebSocket(): Promise<Client> {
    return new Promise((resolve, reject) => {
      if (this.stompClient?.connected) {
        resolve(this.stompClient);
        return;
      }

      const client = new Client({
        webSocketFactory: () => new SockJS(WS_URL) as any,
        debug: (str) => console.log('STOMP:', str),
        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
        onConnect: () => {
          console.log('✅ WebSocket connected');
          this.stompClient = client;
          resolve(client);
        },
        onStompError: (frame) => {
          console.error('❌ STOMP error:', frame);
          reject(new Error('WebSocket connection failed'));
        },
      });

      client.activate();
    });
  }

  // Subscribe to game state updates
  async subscribeToGameUpdates(
    gameId: string,
    callback: (gameState: GameState) => void
  ): Promise<() => void> {
    try {
      const client = await this.initWebSocket();

      const subscription = client.subscribe(
        `/topic/game/${gameId}/state`,
        (message) => {
          try {
            const gameState: GameState = JSON.parse(message.body);
            console.log('📡 Game state update received:', gameState);
            callback(gameState);
          } catch (error) {
            console.error('Failed to parse game state:', error);
          }
        }
      );

      console.log(`📡 Subscribed to /topic/game/${gameId}/state`);

      return () => {
        console.log(`📡 Unsubscribing from /topic/game/${gameId}/state`);
        subscription.unsubscribe();
      };
    } catch (error) {
      console.error('Failed to subscribe to game updates:', error);
      return () => {};
    }
  }

  // Subscribe to traffic updates
  subscribeToTraffic(
    gameId: string,
    callback: (traffic: any) => void
  ) {
    if (!this.stompClient?.connected) {
      console.error('❌ Cannot subscribe to traffic - WebSocket not connected');
      return { unsubscribe: () => {} };
    }

    const subscription = this.stompClient.subscribe(
      `/topic/game/${gameId}/traffic`,
      (message) => {
        try {
          const traffic = JSON.parse(message.body);
          console.log('🚦 Traffic update received:', traffic);
          callback(traffic);
        } catch (error) {
          console.error('Failed to parse traffic data:', error);
        }
      }
    );

    console.log(`📡 Subscribed to /topic/game/${gameId}/traffic`);

    return subscription;
  }

  // Disconnect WebSocket
  disconnect(): void {
    if (this.stompClient?.connected) {
      console.log('🔌 Disconnecting WebSocket');
      this.stompClient.deactivate();
      this.stompClient = null;
    }
  }

  // REST API Methods
  async createGame(mode: string, initialBudget: number): Promise<GameState> {
    console.log(`📤 Creating game: mode=${mode}, budget=${initialBudget}`);
    
    const response = await fetch(`${API_BASE_URL}/api/game/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, initialBudget }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Create game failed:', response.status, errorText);
      throw new Error(`Failed to create game: ${response.status} ${errorText}`);
    }

    const gameState = await response.json();
    console.log('✅ Game created:', gameState.gameId);
    return gameState;
  }

  async getGame(gameId: string): Promise<GameState> {
    console.log(`📤 Fetching game: ${gameId}`);
    
    const response = await fetch(`${API_BASE_URL}/api/game/${gameId}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Get game failed:', response.status, errorText);
      
      if (response.status === 404) {
        throw new Error(`Game not found: ${gameId}`);
      }
      
      throw new Error(`Failed to get game: ${response.status} ${errorText}`);
    }

    const gameState = await response.json();
    console.log('✅ Game fetched:', gameState.gameId, `(${Object.keys(gameState.services || {}).length} services)`);
    return gameState;
  }

  async pauseGame(gameId: string): Promise<GameState> {
    const response = await fetch(`${API_BASE_URL}/api/game/${gameId}/pause`, {
      method: 'POST',
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to pause game: ${response.status} ${errorText}`);
    }

    return response.json();
  }

  async resumeGame(gameId: string): Promise<GameState> {
    const response = await fetch(`${API_BASE_URL}/api/game/${gameId}/resume`, {
      method: 'POST',
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to resume game: ${response.status} ${errorText}`);
    }

    return response.json();
  }

  async setAutoRepair(gameId: string, enabled: boolean): Promise<GameState> {
    const response = await fetch(`${API_BASE_URL}/api/game/${gameId}/auto-repair`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to set auto-repair: ${response.status} ${errorText}`);
    }

    return response.json();
  }

  async updateTrafficMix(
    gameId: string,
    trafficMix: Record<string, number>
  ): Promise<GameState> {
    console.log(`📤 Updating traffic mix for game ${gameId}:`, trafficMix);
    
    const response = await fetch(`${API_BASE_URL}/api/game/${gameId}/traffic-mix`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(trafficMix),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Update traffic mix failed:', response.status, errorText);
      throw new Error(`Failed to update traffic mix: ${response.status} ${errorText}`);
    }

    const gameState = await response.json();
    console.log('✅ Traffic mix updated');
    return gameState;
  }

  async placeService(
    gameId: string,
    serviceType: ServiceType,
    position: Position
  ): Promise<GameState> {
    console.log(`📤 Placing service: ${serviceType} at (${position.x}, ${position.y}, ${position.z})`);
    
    const response = await fetch(`${API_BASE_URL}/api/service/${gameId}/place`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serviceType, position }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Place service failed:', response.status, error);
      throw new Error(`Failed to place service: ${error}`);
    }

    const gameState = await response.json();
    console.log('✅ Service placed successfully');
    return gameState;
  }

  async removeService(gameId: string, serviceId: string): Promise<GameState> {
    const response = await fetch(
      `${API_BASE_URL}/api/service/${gameId}/remove/${serviceId}`,
      { method: 'DELETE' }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to remove service: ${response.status} ${errorText}`);
    }

    return response.json();
  }

  async connectServices(
    gameId: string,
    fromServiceId: string,
    toServiceId: string
  ): Promise<GameState> {
    const response = await fetch(`${API_BASE_URL}/api/service/${gameId}/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromServiceId, toServiceId }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to connect services: ${response.status} ${errorText}`);
    }

    return response.json();
  }

  async repairService(gameId: string, serviceId: string): Promise<GameState> {
    const response = await fetch(
      `${API_BASE_URL}/api/service/${gameId}/repair/${serviceId}`,
      { method: 'POST' }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to repair service: ${error}`);
    }

    return response.json();
  }
}

export const gameApi = new GameApiService();