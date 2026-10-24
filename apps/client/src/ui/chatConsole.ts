export interface ChatConsoleCallbacks {
  onSubmit: (text: string) => { success: boolean; message: string; effect?: string };
  onNotification?: (msg: string) => void;
  onOpen?: () => void;
  onClose?: () => void;
}

export class ChatConsole {
  private container: HTMLDivElement;
  private inputElem: HTMLInputElement;
  private logElem: HTMLDivElement;
  private callbacks: ChatConsoleCallbacks;

  private isOpen: boolean = false;
  private isSinglePlayer: boolean = false;
  private inGame: boolean = false;

  private history: string[] = [];
  private historyIndex: number = -1;

  constructor(parent: HTMLElement, callbacks: ChatConsoleCallbacks) {
    this.callbacks = callbacks;

    this.container = document.createElement('div');
    this.container.id = 'ingame-chat-console';
    this.container.style.cssText = `
      position: absolute;
      bottom: 210px;
      left: 24px;
      width: 480px;
      max-width: 90vw;
      background: rgba(12, 18, 30, 0.88);
      border: 1px solid rgba(212, 175, 55, 0.4);
      border-radius: 8px;
      padding: 10px 14px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(8px);
      z-index: 1000;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      display: none;
      flex-direction: column;
      gap: 8px;
      color: #f1f5f9;
      pointer-events: auto;
      user-select: none;
    `;

    // Header / Title bar
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: #fbbf24;
      border-bottom: 1px solid rgba(251, 191, 36, 0.2);
      padding-bottom: 4px;
    `;
    header.innerHTML = `
      <span>🏛️ COMMAND CONSOLE & CHEAT CODES</span>
      <span style="font-size: 10px; color: #94a3b8; font-weight: normal;">[ENTER] Send · [ESC] Cancel · [↑/↓] History</span>
    `;
    this.container.appendChild(header);

    // Message Log
    this.logElem = document.createElement('div');
    this.logElem.style.cssText = `
      max-height: 120px;
      overflow-y: auto;
      font-size: 12px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding-right: 4px;
    `;
    this.container.appendChild(this.logElem);

    // Initial welcome log
    this.addLogMessage('system', 'Rise of Nations Commander Console active. Type cheat codes or "cheat help".');

    // Input Bar
    const inputRow = document.createElement('div');
    inputRow.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(0, 0, 0, 0.45);
      border: 1px solid rgba(212, 175, 55, 0.5);
      border-radius: 4px;
      padding: 4px 8px;
    `;

    const prefix = document.createElement('span');
    prefix.style.cssText = `
      color: #38bdf8;
      font-weight: bold;
      font-size: 12px;
      font-family: monospace;
    `;
    prefix.textContent = '>';
    inputRow.appendChild(prefix);

    this.inputElem = document.createElement('input');
    this.inputElem.type = 'text';
    this.inputElem.placeholder = 'e.g. cheat resource all, cheat age advance, cheat reveal...';
    this.inputElem.style.cssText = `
      flex: 1;
      background: transparent;
      border: none;
      outline: none;
      color: #fff;
      font-size: 13px;
      font-family: 'Consolas', 'Courier New', monospace;
    `;
    inputRow.appendChild(this.inputElem);

    const sendBtn = document.createElement('button');
    sendBtn.textContent = '↵ Send';
    sendBtn.style.cssText = `
      background: #d97706;
      color: #fff;
      border: 1px solid #b45309;
      border-radius: 4px;
      padding: 3px 8px;
      font-size: 11px;
      cursor: pointer;
      font-weight: 600;
    `;
    sendBtn.addEventListener('click', () => this.submitCurrentText());
    inputRow.appendChild(sendBtn);

    this.container.appendChild(inputRow);
    parent.appendChild(this.container);

    this.setupListeners();
  }

  public setGameState(inGame: boolean, isSinglePlayer: boolean): void {
    this.inGame = inGame;
    this.isSinglePlayer = isSinglePlayer;
    if (!inGame && this.isOpen) {
      this.close();
    }
  }

  private setupListeners(): void {
    // Global key listener for Enter / Escape to open/close chat console
    window.addEventListener('keydown', (e) => {
      if (!this.inGame) return;

      if (e.key === 'Enter') {
        if (!this.isOpen) {
          // Open console
          this.open();
          e.preventDefault();
          e.stopPropagation();
        } else {
          // If already open, submit text
          this.submitCurrentText();
          e.preventDefault();
          e.stopPropagation();
        }
        return;
      }

      if (e.key === 'Escape' && this.isOpen) {
        this.close();
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // History navigation (Up / Down)
      if (this.isOpen && document.activeElement === this.inputElem) {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          this.navigateHistory(-1);
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          this.navigateHistory(1);
        }
      }
    });

    // Prevent clicks inside chat console from leaking to game map
    this.container.addEventListener('mousedown', (e) => e.stopPropagation());
    this.container.addEventListener('click', (e) => e.stopPropagation());
  }

  private navigateHistory(direction: number): void {
    if (this.history.length === 0) return;

    if (this.historyIndex === -1 && direction < 0) {
      this.historyIndex = this.history.length - 1;
    } else {
      this.historyIndex += direction;
    }

    if (this.historyIndex < 0) {
      this.historyIndex = 0;
    } else if (this.historyIndex >= this.history.length) {
      this.historyIndex = -1;
      this.inputElem.value = '';
      return;
    }

    this.inputElem.value = this.history[this.historyIndex];
  }

  public open(): void {
    this.isOpen = true;
    this.container.style.display = 'flex';
    this.inputElem.value = '';
    this.historyIndex = -1;
    setTimeout(() => {
      this.inputElem.focus();
    }, 10);
    this.callbacks.onOpen?.();
  }

  public close(): void {
    this.isOpen = false;
    this.container.style.display = 'none';
    this.inputElem.blur();
    this.historyIndex = -1;
    this.callbacks.onClose?.();
  }

  private submitCurrentText(): void {
    const text = this.inputElem.value.trim();
    if (!text) {
      this.close();
      return;
    }

    // Add to history
    this.history.push(text);
    if (this.history.length > 50) this.history.shift();

    // Log the entered command
    this.addLogMessage('user', text);

    if (!this.isSinglePlayer) {
      const msg = '⚠️ Cheats are strictly disabled in Multiplayer LAN matches.';
      this.addLogMessage('error', msg);
      this.callbacks.onNotification?.(msg);
      this.close();
      return;
    }

    // Execute via callback
    const result = this.callbacks.onSubmit(text);
    if (result.success) {
      this.addLogMessage('success', result.message);
      this.callbacks.onNotification?.(result.message);
    } else {
      this.addLogMessage('error', result.message);
      this.callbacks.onNotification?.(result.message);
    }

    this.close();
  }

  public addLogMessage(type: 'user' | 'system' | 'success' | 'error', text: string): void {
    const line = document.createElement('div');
    line.style.cssText = `line-height: 1.4; word-break: break-word;`;

    if (type === 'user') {
      line.innerHTML = `<span style="color: #93c5fd; font-weight: 600;">[Commander]:</span> <span style="color: #f8fafc;">${this.escapeHtml(text)}</span>`;
    } else if (type === 'success') {
      line.innerHTML = `<span style="color: #4ade80; font-weight: 600;">✓</span> <span style="color: #86efac;">${this.escapeHtml(text)}</span>`;
    } else if (type === 'error') {
      line.innerHTML = `<span style="color: #f87171; font-weight: 600;">✕</span> <span style="color: #fca5a5;">${this.escapeHtml(text)}</span>`;
    } else {
      line.innerHTML = `<span style="color: #fbbf24; font-weight: 600;">ℹ</span> <span style="color: #cbd5e1;">${this.escapeHtml(text)}</span>`;
    }

    this.logElem.appendChild(line);
    this.logElem.scrollTop = this.logElem.scrollHeight;
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
