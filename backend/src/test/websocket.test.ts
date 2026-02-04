import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { WebSocket } from 'ws';
import msgpack from 'msgpack-lite';

const WS_URL = 'ws://localhost:3001';

describe('WebSocket Server', () => {
  let ws: WebSocket;
  
  beforeAll(async () => {
    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));
  });
  
  afterAll(() => {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.close();
    }
  });
  
  it('should connect and receive connected message', async () => {
    ws = new WebSocket(WS_URL);
    ws.binaryType = 'arraybuffer';
    
    const message = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout')), 5000);
      
      ws.onmessage = (event) => {
        clearTimeout(timeout);
        const decoded = msgpack.decode(new Uint8Array(event.data as ArrayBuffer));
        resolve(decoded);
      };
      
      ws.onerror = (error) => {
        clearTimeout(timeout);
        reject(error);
      };
    });
    
    expect(message).toHaveProperty('type', 'connected');
    expect(message).toHaveProperty('data.userId');
  });
  
  it('should join queue and receive searching status', async () => {
    const joinMessage = {
      type: 'join',
      data: {
        ageCategory: 'adult',
        mode: 'text',
        queueType: 'moderated',
        interests: ['gaming', 'music'],
      },
    };
    
    ws.send(msgpack.encode(joinMessage));
    
    const message = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout')), 5000);
      
      ws.onmessage = (event) => {
        clearTimeout(timeout);
        const decoded = msgpack.decode(new Uint8Array(event.data as ArrayBuffer));
        if (decoded.type === 'searching') {
          resolve(decoded);
        }
      };
    });
    
    expect(message).toHaveProperty('type', 'searching');
    expect(message).toHaveProperty('data.position');
    expect(message).toHaveProperty('data.estimatedTime');
  });
});