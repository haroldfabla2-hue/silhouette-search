// =============================================================================
// SILHOUETTE V5.0 - ADVANCED TERMINAL SYSTEM
// Sistema de terminales avanzado con tmux y xterm.js
// =============================================================================

import { EventEmitter } from 'events';
import * as pty from 'node-pty';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as chokidar from 'chokidar';
import { spawn } from 'child_process';

class TerminalSystem extends EventEmitter {
  constructor() {
    super();
    this.terminals = new Map(); // Terminal ID -> Terminal info
    this.sessions = new Map(); // Session ID -> Session info
    this.tmuxSessions = new Map(); // tmux session tracking
    this.outputBuffer = new Map(); // Buffer for each terminal
    this.isInitialized = false;
    
    // Configuration
    this.config = {
      maxTerminals: 10,
      maxOutputLines: 1000,
      maxBufferSize: 100 * 1024, // 100KB
      autoScroll: true,
      colorScheme: 'silhouette-dark',
      shellPath: this.getDefaultShell(),
      workingDirectory: process.cwd()
    };
    
    // Terminal themes
    this.themes = {
      'silhouette-dark': {
        background: '#0E0E10',
        foreground: '#D4D4D4',
        cursor: '#4EC9B0',
        black: '#0E0E10',
        red: '#CD3131',
        green: '#0BC844',
        yellow: '#E5E50B',
        blue: '#2472C8',
        magenta: '#BC3FBC',
        cyan: '#11A8CD',
        white: '#D4D4D4',
        brightBlack: '#666666',
        brightRed: '#F14C4C',
        brightGreen: '#23D18B',
        brightYellow: '#F5F543',
        brightBlue: '#3B8EEA',
        brightMagenta: '#D670D6',
        brightCyan: '#29B8DB',
        brightWhite: '#E5E5E5'
      },
      'silhouette-light': {
        background: '#FFFFFF',
        foreground: '#000000',
        cursor: '#007ACC',
        black: '#000000',
        red: '#CD3131',
        green: '#00BC00',
        yellow: '#E5E50B',
        blue: '#2472C8',
        magenta: '#BC3FBC',
        cyan: '#11A8CD',
        white: '#E5E5E5',
        brightBlack: '#666666',
        brightRed: '#F14C4C',
        brightGreen: '#23D18B',
        brightYellow: '#F5F543',
        brightBlue: '#3B8EEA',
        brightMagenta: '#D670D6',
        brightCyan: '#29B8DB',
        brightWhite: '#FFFFFF'
      }
    };
  }

  // =============================================================================
  // INICIALIZACIÓN
  // =============================================================================
  
  async initialize() {
    console.log('🖥️ Initializing Advanced Terminal System...');
    
    try {
      // Setup terminal session manager
      await this.setupSessionManager();
      
      // Initialize tmux integration
      await this.initializeTmux();
      
      // Setup command history
      this.setupCommandHistory();
      
      // Setup terminal plugins
      await this.setupTerminalPlugins();
      
      this.isInitialized = true;
      console.log('✅ Advanced Terminal System initialized');
      console.log(`📱 Available shells: ${Object.keys(this.getAvailableShells()).join(', ')}`);
      
      this.emit('initialized');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to initialize Terminal System:', error);
      return false;
    }
  }

  async setupSessionManager() {
    // Create default session
    const sessionId = 'default';
    this.sessions.set(sessionId, {
      id: sessionId,
      name: 'Default Session',
      terminalIds: [],
      createdAt: Date.now(),
      lastActivity: Date.now(),
      workingDirectory: this.config.workingDirectory,
      environment: process.env
    });
    
    console.log('✅ Session manager initialized');
  }

  async initializeTmux() {
    // Check if tmux is available
    try {
      const result = await this.runCommand('tmux -V');
      const version = result.stdout.trim();
      console.log(`✅ tmux available: ${version}`);
      
      // Create default tmux session for development
      await this.createTmuxSession('silhouette-dev');
      
    } catch (error) {
      console.warn('⚠️ tmux not available, using basic terminal emulation');
    }
  }

  setupCommandHistory() {
    this.commandHistory = new Map();
    this.commandIndex = new Map();
  }

  async setupTerminalPlugins() {
    // Register built-in terminal plugins
    this.plugins = {
      'git': this.gitPlugin(),
      'npm': this.npmPlugin(),
      'node': this.nodePlugin(),
      'python': this.pythonPlugin(),
      'docker': this.dockerPlugin(),
      'ls': this.lsPlugin(),
      'silhouette': this.silhouettePlugin()
    };
    
    console.log('✅ Terminal plugins initialized');
  }

  // =============================================================================
  // GESTIÓN DE TERMINALES
  // =============================================================================
  
  async createTerminal(options = {}) {
    const terminalId = this.generateTerminalId();
    const sessionId = options.sessionId || 'default';
    
    // Check terminal limits
    if (this.terminals.size >= this.config.maxTerminals) {
      throw new Error(`Maximum number of terminals (${this.config.maxTerminals}) reached`);
    }
    
    // Get session
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    
    // Create terminal
    const terminal = {
      id: terminalId,
      sessionId: sessionId,
      title: options.title || `Terminal ${this.terminals.size + 1}`,
      workingDirectory: options.workingDirectory || session.workingDirectory,
      shellPath: options.shellPath || this.config.shellPath,
      columns: options.columns || 80,
      rows: options.rows || 24,
      theme: options.theme || this.config.colorScheme,
      isRunning: false,
      createdAt: Date.now(),
      output: [],
      history: [],
      environment: { ...session.environment }
    };
    
    // Add plugins for this terminal
    terminal.plugins = { ...this.plugins };
    
    // Initialize terminal
    await this.initializeTerminal(terminal);
    
    // Store terminal
    this.terminals.set(terminalId, terminal);
    session.terminalIds.push(terminalId);
    session.lastActivity = Date.now();
    
    // Setup output buffer
    this.outputBuffer.set(terminalId, []);
    
    this.emit('terminalCreated', { terminal, session });
    
    console.log(`✅ Terminal created: ${terminalId} (Session: ${sessionId})`);
    return terminal;
  }

  async initializeTerminal(terminal) {
    // Create PTY process
    try {
      const ptyProcess = pty.spawn(terminal.shellPath, [], {
        name: 'xterm-color',
        cols: terminal.columns,
        rows: terminal.rows,
        cwd: terminal.workingDirectory,
        env: terminal.environment
      });
      
      terminal.process = ptyProcess;
      terminal.isRunning = true;
      
      // Setup event handlers
      ptyProcess.onData((data) => {
        this.handleTerminalOutput(terminal, data);
      });
      
      ptyProcess.onExit(({ exitCode, signal }) => {
        this.handleTerminalExit(terminal, exitCode, signal);
      });
      
      // Initialize with welcome message
      await this.sendToTerminal(terminal, this.getWelcomeMessage(terminal));
      
    } catch (error) {
      console.error(`❌ Failed to initialize terminal ${terminal.id}:`, error);
      terminal.error = error.message;
      terminal.isRunning = false;
    }
  }

  async sendToTerminal(terminal, input) {
    if (!terminal.process || !terminal.isRunning) {
      return false;
    }
    
    try {
      // Handle special commands
      if (this.isSpecialCommand(input)) {
        return await this.handleSpecialCommand(terminal, input);
      }
      
      // Send to PTY
      terminal.process.write(input);
      
      // Add to history
      terminal.history.push({
        command: input,
        timestamp: Date.now(),
        workingDirectory: terminal.workingDirectory
      });
      
      // Keep history limited
      if (terminal.history.length > 100) {
        terminal.history = terminal.history.slice(-100);
      }
      
      this.emit('commandExecuted', { terminal, command: input });
      
      return true;
      
    } catch (error) {
      console.error(`❌ Failed to send command to terminal ${terminal.id}:`, error);
      return false;
    }
  }

  async closeTerminal(terminalId) {
    const terminal = this.terminals.get(terminalId);
    if (!terminal) {
      return false;
    }
    
    try {
      // Kill PTY process
      if (terminal.process) {
        terminal.process.kill();
      }
      
      // Remove from session
      const session = this.sessions.get(terminal.sessionId);
      if (session) {
        session.terminalIds = session.terminalIds.filter(id => id !== terminalId);
        session.lastActivity = Date.now();
      }
      
      // Remove terminal
      this.terminals.delete(terminalId);
      this.outputBuffer.delete(terminalId);
      
      this.emit('terminalClosed', { terminal });
      
      console.log(`✅ Terminal closed: ${terminalId}`);
      return true;
      
    } catch (error) {
      console.error(`❌ Failed to close terminal ${terminalId}:`, error);
      return false;
    }
  }

  // =============================================================================
  // GESTIÓN DE SESIONES
  // =============================================================================
  
  async createSession(options = {}) {
    const sessionId = this.generateSessionId();
    
    const session = {
      id: sessionId,
      name: options.name || `Session ${this.sessions.size + 1}`,
      description: options.description || '',
      terminalIds: [],
      workingDirectory: options.workingDirectory || this.config.workingDirectory,
      environment: { ...process.env, ...options.environment },
      createdAt: Date.now(),
      lastActivity: Date.now(),
      isActive: true
    };
    
    this.sessions.set(sessionId, session);
    
    this.emit('sessionCreated', { session });
    
    console.log(`✅ Session created: ${sessionId}`);
    return session;
  }

  async deleteSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }
    
    // Close all terminals in the session
    for (const terminalId of session.terminalIds) {
      await this.closeTerminal(terminalId);
    }
    
    // Remove session
    this.sessions.delete(sessionId);
    
    this.emit('sessionDeleted', { session });
    
    console.log(`✅ Session deleted: ${sessionId}`);
    return true;
  }

  async changeSessionDirectory(sessionId, directory) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }
    
    try {
      // Validate directory
      await fs.access(directory);
      
      session.workingDirectory = directory;
      session.lastActivity = Date.now();
      
      // Update all terminals in the session
      for (const terminalId of session.terminalIds) {
        const terminal = this.terminals.get(terminalId);
        if (terminal) {
          terminal.workingDirectory = directory;
        }
      }
      
      this.emit('sessionDirectoryChanged', { session, directory });
      
      return true;
      
    } catch (error) {
      console.error(`❌ Failed to change directory:`, error);
      return false;
    }
  }

  // =============================================================================
  // TMUX INTEGRATION
  // =============================================================================
  
  async createTmuxSession(sessionName) {
    try {
      const command = `tmux new-session -d -s ${sessionName}`;
      await this.runCommand(command);
      
      this.tmuxSessions.set(sessionName, {
        name: sessionName,
        createdAt: Date.now(),
        isActive: false
      });
      
      console.log(`✅ tmux session created: ${sessionName}`);
      return true;
      
    } catch (error) {
      console.error(`❌ Failed to create tmux session:`, error);
      return false;
    }
  }

  async attachToTmux(sessionName, terminal) {
    try {
      // This would be implemented to attach a terminal to a tmux session
      // For now, just simulate the attachment
      const tmuxInfo = this.tmuxSessions.get(sessionName);
      if (tmuxInfo) {
        tmuxInfo.isActive = true;
        console.log(`🔗 Terminal attached to tmux session: ${sessionName}`);
        return true;
      }
      
      return false;
      
    } catch (error) {
      console.error(`❌ Failed to attach to tmux session:`, error);
      return false;
    }
  }

  // =============================================================================
  // PLUGINS DEL SISTEMA
  // =============================================================================
  
  gitPlugin() {
    return {
      name: 'git',
      commands: {
        'status': async (args, terminal) => {
          const result = await this.runCommand('git status', terminal.workingDirectory);
          return result.stdout;
        },
        'branch': async (args, terminal) => {
          const result = await this.runCommand('git branch', terminal.workingDirectory);
          return result.stdout;
        },
        'log': async (args, terminal) => {
          const count = args[0] || '10';
          const result = await this.runCommand(`git log --oneline -${count}`, terminal.workingDirectory);
          return result.stdout;
        }
      }
    };
  }

  npmPlugin() {
    return {
      name: 'npm',
      commands: {
        'install': async (args, terminal) => {
          const packageName = args[0];
          if (!packageName) return 'Error: Package name required';
          
          const result = await this.runCommand(`npm install ${packageName}`, terminal.workingDirectory);
          return result.stdout;
        },
        'start': async (args, terminal) => {
          const result = await this.runCommand('npm start', terminal.workingDirectory);
          return result.stdout;
        },
        'run': async (args, terminal) => {
          const script = args[0];
          if (!script) return 'Error: Script name required';
          
          const result = await this.runCommand(`npm run ${script}`, terminal.workingDirectory);
          return result.stdout;
        }
      }
    };
  }

  nodePlugin() {
    return {
      name: 'node',
      commands: {
        'version': async () => {
          const result = await this.runCommand('node --version');
          return result.stdout;
        },
        'run': async (args, terminal) => {
          const file = args[0];
          if (!file) return 'Error: File path required';
          
          const result = await this.runCommand(`node ${file}`, terminal.workingDirectory);
          return result.stdout;
        }
      }
    };
  }

  pythonPlugin() {
    return {
      name: 'python',
      commands: {
        'version': async () => {
          const result = await this.runCommand('python --version');
          return result.stdout;
        },
        'run': async (args, terminal) => {
          const file = args[0];
          if (!file) return 'Error: File path required';
          
          const result = await this.runCommand(`python ${file}`, terminal.workingDirectory);
          return result.stdout;
        }
      }
    };
  }

  dockerPlugin() {
    return {
      name: 'docker',
      commands: {
        'ps': async () => {
          const result = await this.runCommand('docker ps');
          return result.stdout;
        },
        'images': async () => {
          const result = await this.runCommand('docker images');
          return result.stdout;
        }
      }
    };
  }

  lsPlugin() {
    return {
      name: 'ls',
      commands: {
        'dir': async (args, terminal) => {
          const path = args[0] || terminal.workingDirectory;
          const result = await this.runCommand(`ls -la ${path}`);
          return result.stdout;
        }
      }
    };
  }

  silhouettePlugin() {
    return {
      name: 'silhouette',
      commands: {
        'projects': async () => {
          const projects = Array.from(this.projects?.values() || []);
          return `Active projects:\n${projects.map(p => `  - ${p.name} (${p.id})`).join('\n')}`;
        },
        'status': async () => {
          const activeTerminals = Array.from(this.terminals.values());
          return `System Status:
  Active Terminals: ${activeTerminals.length}
  Active Sessions: ${this.sessions.size}
  tmux Sessions: ${this.tmuxSessions.size}`;
        }
      }
    };
  }

  // =============================================================================
  // EVENT HANDLERS
  // =============================================================================
  
  handleTerminalOutput(terminal, data) {
    // Add to output buffer
    const buffer = this.outputBuffer.get(terminal.id) || [];
    buffer.push({
      data,
      timestamp: Date.now()
    });
    
    // Limit buffer size
    if (buffer.length > this.config.maxOutputLines) {
      buffer.shift();
    }
    
    this.outputBuffer.set(terminal.id, buffer);
    
    // Add to terminal output
    terminal.output.push({
      data,
      timestamp: Date.now()
    });
    
    // Limit terminal output
    if (terminal.output.length > this.config.maxOutputLines) {
      terminal.output = terminal.output.slice(-this.config.maxOutputLines);
    }
    
    this.emit('terminalOutput', { terminal, data });
  }

  handleTerminalExit(terminal, exitCode, signal) {
    terminal.isRunning = false;
    terminal.exitCode = exitCode;
    terminal.signal = signal;
    
    this.emit('terminalExit', { terminal, exitCode, signal });
    
    console.log(`🔚 Terminal ${terminal.id} exited with code ${exitCode}`);
  }

  // =============================================================================
  // UTILIDADES
  // =============================================================================
  
  getAvailableShells() {
    const shells = {};
    
    // Windows
    if (process.platform === 'win32') {
      shells.cmd = 'cmd.exe';
      shells.powershell = 'powershell.exe';
      shells.gitbash = 'C:\\Program Files\\Git\\bin\\bash.exe';
    } else {
      // Unix/Linux
      shells.bash = '/bin/bash';
      shells.zsh = '/bin/zsh';
      shells.fish = '/usr/bin/fish';
    }
    
    return shells;
  }

  getDefaultShell() {
    if (process.platform === 'win32') {
      return 'powershell.exe';
    } else {
      return process.env.SHELL || '/bin/bash';
    }
  }

  getWelcomeMessage(terminal) {
    return `
🚀 Silhouette V5.0 Terminal - Ready!

Terminal ID: ${terminal.id}
Session: ${terminal.sessionId}
Working Directory: ${terminal.workingDirectory}
Shell: ${terminal.shellPath}

Available commands:
  • Git commands: git status, git branch, git log
  • NPM commands: npm install <package>, npm start
  • Silhouette commands: silhouette projects, silhouette status

Type 'help' for more information or use plugins:
  help git
  help npm
  help silhouette

`;
  }

  isSpecialCommand(input) {
    const commands = ['help', 'clear', 'exit', 'cd', 'set-theme', 'plugins'];
    return commands.some(cmd => input.startsWith(cmd));
  }

  async handleSpecialCommand(terminal, input) {
    const [command, ...args] = input.trim().split(' ');
    
    switch (command) {
      case 'help':
        return await this.handleHelpCommand(terminal, args);
      case 'clear':
        return await this.handleClearCommand(terminal);
      case 'exit':
        return await this.handleExitCommand(terminal);
      case 'cd':
        return await this.handleCdCommand(terminal, args[0]);
      case 'set-theme':
        return await this.handleThemeCommand(terminal, args[0]);
      case 'plugins':
        return await this.handlePluginsCommand(terminal);
      default:
        return null;
    }
  }

  async handleHelpCommand(terminal, args) {
    const pluginName = args[0];
    
    if (pluginName) {
      const plugin = terminal.plugins[pluginName];
      if (plugin) {
        const helpText = `Help for ${pluginName} plugin:
${Object.keys(plugin.commands).map(cmd => `  ${cmd}`).join('\n')}`;
        return helpText;
      } else {
        return `Plugin not found: ${pluginName}`;
      }
    } else {
      return `Available plugins:
${Object.keys(terminal.plugins).map(p => `  - ${p}`).join('\n')}

Type 'help <plugin>' for plugin-specific help.`;
    }
  }

  async handleClearCommand(terminal) {
    // Clear terminal output
    terminal.output = [];
    this.outputBuffer.set(terminal.id, []);
    
    // Send clear sequence
    return '\x1b[2J\x1b[H'; // ANSI clear screen
  }

  async handleExitCommand(terminal) {
    await this.closeTerminal(terminal.id);
    return 'Terminal closed.';
  }

  async handleCdCommand(terminal, path) {
    if (!path) {
      return 'Usage: cd <directory>';
    }
    
    const fullPath = path.startsWith('/') ? path : path.join(terminal.workingDirectory, path);
    
    try {
      await this.changeSessionDirectory(terminal.sessionId, fullPath);
      terminal.workingDirectory = fullPath;
      return `Changed directory to: ${fullPath}`;
    } catch (error) {
      return `Error: ${error.message}`;
    }
  }

  async handleThemeCommand(terminal, themeName) {
    if (!themeName) {
      return `Available themes: ${Object.keys(this.themes).join(', ')}`;
    }
    
    if (!this.themes[themeName]) {
      return `Theme not found: ${themeName}`;
    }
    
    terminal.theme = themeName;
    return `Theme set to: ${themeName}`;
  }

  async handlePluginsCommand(terminal) {
    const pluginList = Object.keys(terminal.plugins).map(name => {
      const plugin = terminal.plugins[name];
      const commandCount = Object.keys(plugin.commands).length;
      return `  ${name}: ${commandCount} commands`;
    }).join('\n');
    
    return `Available plugins:\n${pluginList}`;
  }

  async runCommand(command, workingDirectory = null) {
    return new Promise((resolve, reject) => {
      const child = spawn('sh', ['-c', command], {
        cwd: workingDirectory || this.config.workingDirectory,
        env: process.env
      });
      
      let stdout = '';
      let stderr = '';
      
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      child.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr, code });
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr}`));
        }
      });
      
      child.on('error', (error) => {
        reject(error);
      });
    });
  }

  generateTerminalId() {
    return `term-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  generateSessionId() {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // =============================================================================
  // CLEANUP
  // =============================================================================
  
  async dispose() {
    // Close all terminals
    for (const terminal of this.terminals.values()) {
      await this.closeTerminal(terminal.id);
    }
    
    // Close all tmux sessions
    for (const tmuxInfo of this.tmuxSessions.values()) {
      try {
        await this.runCommand(`tmux kill-session -t ${tmuxInfo.name}`);
      } catch (error) {
        console.warn(`⚠️ Failed to kill tmux session: ${tmuxInfo.name}`);
      }
    }
    
    this.terminals.clear();
    this.sessions.clear();
    this.tmuxSessions.clear();
    this.outputBuffer.clear();
    
    console.log('🗑️ Advanced Terminal System disposed');
  }
}

export { TerminalSystem };
