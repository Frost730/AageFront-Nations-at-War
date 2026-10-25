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
    this.container.className = 'aoe-parchment-card';
    this.container.style.cssText = `
      position: absolute;
      bottom: 205px;
      left: 16px;
      width: 460px;
      max-width: 90vw;
      padding: 12px 14px;
      border: 2px solid #8c6a34;
      box-shadow: 0 12px 36px rgba(0, 0, 0, 0.9), inset 0 0 35px rgba(120, 75, 25, 0.25);
      border-radius: 4px;
      z-index: 1000;
      font-family: 'Inter', sans-serif;
      display: none;
      flex-direction: column;
      gap: 8px;
      color: #2b1809;
      pointer-events: auto;
      user-select: none;
    `;

    // 4 Corner Rivets
    ['tl', 'tr', 'bl', 'br'].forEach(pos => {
      const rivet = document.createElement('div');
      rivet.className = `aoe-corner-rivet aoe-corner-rivet-${pos}`;
      rivet.style.cssText = `
        position: absolute;
        width: 8px;
        height: 8px;
        top: ${pos.startsWith('t') ? '4px' : 'auto'};
        bottom: ${pos.startsWith('b') ? '4px' : 'auto'};
        left: ${pos.endsWith('l') ? '4px' : 'auto'};
        right: ${pos.endsWith('r') ? '4px' : 'auto'};
      `;
      this.container.appendChild(rivet);
    });

    // Header / Title bar
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.8px;
      color: #451a03;
      border-bottom: 1.5px solid #8c6a34;
      padding-bottom: 4px;
      font-family: 'Cinzel', serif;
    `;
    header.innerHTML = `
      <span>🏛️ COMMAND CONSOLE & CHEATS</span>
      <span style="font-size: 9.5px; color: #78350f; font-family: 'Inter', sans-serif; font-weight: 600;">[ENTER] Send · [ESC] Close · [↑/↓] History</span>
    `;
    this.container.appendChild(header);

    // Message Log
    this.logElem = document.createElement('div');
    this.logElem.className = 'aoe-parchment-inner';
    this.logElem.style.cssText = `
      max-height: 115px;
      overflow-y: auto;
      font-size: 11px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 6px 10px;
      color: #2b1809;
      background: rgba(255, 255, 255, 0.45);
      border: 1px solid #8c6a34;
    `;
    this.container.appendChild(this.logElem);

    // Initial welcome log
    this.addLogMessage('system', 'Rise of Nations Commander Console active. Type cheat codes or "cheat help".');

    // Input Bar
    const inputRow = document.createElement('div');
    inputRow.style.cssText = `
      display: flex;
      align-items: center;
      gap: 6px;
    `;

    const inputWrap = document.createElement('div');
    inputWrap.className = 'aoe-input';
    inputWrap.style.cssText = `
      flex: 1;
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 3px 8px;
      background: #fdf6e7;
      border: 1.5px solid #8c6a34;
      border-radius: 3px;
    `;

    const prefix = document.createElement('span');
    prefix.style.cssText = `
      font-size: 12px;
      color: #78350f;
    `;
    prefix.textContent = '⚔️';
    inputWrap.appendChild(prefix);

    this.inputElem = document.createElement('input');
    this.inputElem.type = 'text';
    this.inputElem.placeholder = 'e.g. cheat resource all, cheat age advance, cheat reveal...';
    this.inputElem.style.cssText = `
      flex: 1;
      background: transparent;
      border: none;
      outline: none;
      color: #2b1809;
      font-size: 11.5px;
      font-weight: 600;
      font-family: 'Consolas', 'Courier New', monospace;
    `;
    inputWrap.appendChild(this.inputElem);
    inputRow.appendChild(inputWrap);

    const sendBtn = document.createElement('button');
    sendBtn.className = 'aoe-btn-crimson';
    sendBtn.textContent = 'Send ↵';
    sendBtn.style.cssText = `
      padding: 4px 12px;
      font-size: 11px;
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
    line.style.cssText = `line-height: 1.35; word-break: break-word; font-family: monospace; font-size: 11px;`;

    if (type === 'user') {
      line.innerHTML = `<span style="color: #78350f; font-weight: 700;">[Commander]:</span> <span style="color: #1c0e05; font-weight: 600;">${this.escapeHtml(text)}</span>`;
    } else if (type === 'success') {
      line.innerHTML = `<span style="color: #166534; font-weight: 700;">👑 [Success]:</span> <span style="color: #14532d; font-weight: 600;">${this.escapeHtml(text)}</span>`;
    } else if (type === 'error') {
      line.innerHTML = `<span style="color: #991b1b; font-weight: 700;">⚠️ [Denied]:</span> <span style="color: #7f1d1d; font-weight: 600;">${this.escapeHtml(text)}</span>`;
    } else {
      line.innerHTML = `<span style="color: #854d0e; font-weight: 700;">📜 [System]:</span> <span style="color: #3b1d08;">${this.escapeHtml(text)}</span>`;
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
