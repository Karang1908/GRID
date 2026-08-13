// Thin WebSocket wrapper.
//
// Responsibilities:
//   - Connect to ws://<hostname>:8080
//   - Parse (JSON) and dispatch messages to provided callbacks
//   - Expose sendState() for the local loop
//   - Reconnect once after a 2s delay on close (no exponential backoff — chapter one)
//
// Status callbacks: onStatusChange('connecting' | 'open' | 'closed').

import { MSG } from '../../shared/protocol.js';

export class NetworkClient {
  constructor({
    url,
    onInit,
    onJoin,
    onState,
    onLeave,
    onName,
    onStatusChange,
  } = {}) {
    const isHttps = location.protocol === 'https:';
    const proto = isHttps ? 'wss' : 'ws';
    
    // Support Vite proxy /ws (for ngrok tunnels and HTTPS) and direct port 8080 fallback
    this.urls = url ? [url] : [
      `${proto}://${location.host}/ws`,
      `${proto}://${location.hostname || 'localhost'}:8080`
    ];
    this.urlIndex = 0;

    this.onInit = onInit || (() => {});
    this.onJoin = onJoin || (() => {});
    this.onState = onState || (() => {});
    this.onLeave = onLeave || (() => {});
    this.onName = onName || (() => {});
    this.onStatusChange = onStatusChange || (() => {});
    this.ws = null;
    this.selfId = null;
    this.selfColor = null;
    this._reconnectT = null;
    this._connectedOnce = false;
  }

  connect() {
    this.onStatusChange('connecting');
    const targetUrl = this.urls[this.urlIndex % this.urls.length];
    
    let ws;
    try {
      ws = new WebSocket(targetUrl);
    } catch (e) {
      console.warn(`network: failed to create WebSocket for ${targetUrl}:`, e);
      this._retryNext();
      return;
    }

    this.ws = ws;
    
    ws.onopen = () => {
      this._connectedOnce = true;
      this.onStatusChange('open');
    };

    ws.onmessage = (e) => {
      let msg;
      try {
        msg = JSON.parse(e.data);
      } catch (err) {
        console.warn('network: bad JSON', err);
        return;
      }
      this._dispatch(msg);
    };

    ws.onclose = () => {
      this.onStatusChange('closed');
      this.ws = null;
      this._retryNext();
    };

    ws.onerror = (e) => {
      console.warn(`network: socket error on ${targetUrl}`, e);
    };
  }

  _retryNext() {
    if (this._reconnectT) return;
    this._reconnectT = setTimeout(() => {
      this._reconnectT = null;
      if (!this._connectedOnce) {
        this.urlIndex++; // Try next fallback URL if never successfully connected
      }
      this.connect();
    }, 1500);
  }

  _dispatch(msg) {
    switch (msg.type) {
      case MSG.INIT: {
        this.selfId = msg.id;
        this.selfColor = msg.color;
        this.onInit(msg);
        break;
      }
      case MSG.JOIN: {
        // Don't notify for our own id (server shouldn't send it, but guard anyway).
        if (msg.id !== this.selfId) this.onJoin(msg);
        break;
      }
      case MSG.STATE: {
        if (msg.id !== this.selfId) this.onState(msg);
        break;
      }
      case MSG.LEAVE: {
        if (msg.id !== this.selfId) this.onLeave(msg);
        break;
      }
      case MSG.NAME: {
        if (msg.id !== this.selfId) this.onName(msg);
        break;
      }
      default:
        console.warn('network: unknown msg type', msg.type);
    }
  }

  sendName(name) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({ type: MSG.NAME, name }));
  }

  sendState(state) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({ type: MSG.STATE, ...state }));
  }

  close() {
    if (this._reconnectT) {
      clearTimeout(this._reconnectT);
      this._reconnectT = null;
    }
    if (this.ws) this.ws.close();
  }
}
