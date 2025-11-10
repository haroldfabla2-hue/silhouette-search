// =============================================================================
// SILHOUETTE V5.0 - LIVE PREVIEW SYSTEM
// Sistema de preview en tiempo real con hot reload y WebSocket
// =============================================================================

import { EventEmitter } from 'events';
import * as express from 'express';
import { WebSocketServer } from 'ws';
import { createProxyMiddleware } from 'http-proxy-middleware';
import * as chokidar from 'chokidar';
import * as path from 'path';
import * as http from 'http';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

class LivePreview extends EventEmitter {
  constructor() {
    super();
    this.previewServers = new Map(); // Project ID -> Server info
    this.projectWatchers = new Map(); // Project ID -> Watcher
    this.connections = new Map(); // Project ID -> WebSocket connections
    this.rebuildQueue = new Set(); // Files queued for rebuild
    this.isInitialized = false;
    
    // Server configuration
    this.serverConfig = {
      port: 3000,
      host: 'localhost',
      hotReloadDelay: 500,
      debounceTime: 300,
      maxConnections: 50
    };
    
    // Rebuild configuration
    this.rebuildConfig = {
      debounceTime: 300,
      retryAttempts: 3,
      timeout: 30000
    };
    
    // File patterns to watch
    this.watchPatterns = {
      include: ['**/*.html', '**/*.css', '**/*.js', '**/*.ts', '**/*.jsx', '**/*.tsx', '**/*.json', '**/*.md'],
      exclude: [
        'node_modules/**/*',
        'dist/**/*',
        'build/**/*',
        '.git/**/*',
        '**/*.log',
        '**/.DS_Store',
        '**/.env'
      ]
    };
  }

  // =============================================================================
  // INICIALIZACIÓN
  // =============================================================================
  
  async initialize() {
    console.log('🔄 Initializing Live Preview System...');
    
    try {
      // Setup global server for static assets
      await this.setupStaticServer();
      
      // Setup WebSocket server
      await this.setupWebSocketServer();
      
      this.isInitialized = true;
      console.log('✅ Live Preview System initialized');
      console.log(`📡 WebSocket server ready`);
      
      this.emit('initialized');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to initialize Live Preview:', error);
      return false;
    }
  }

  async setupStaticServer() {
    this.staticApp = express();
    
    // Serve Monaco Editor assets
    this.staticApp.use('/monaco-editor', express.static('node_modules/monaco-editor/min'));
    
    // Serve project static files
    this.staticApp.use('/projects', express.static(this.getProjectsPath()));
    
    // Default index
    this.staticApp.get('/', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Silhouette V5.0 - Live Preview</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              text-align: center; 
              padding: 50px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
            }
            h1 { font-size: 2.5em; margin-bottom: 20px; }
            .project-list { 
              display: flex; 
              flex-wrap: wrap; 
              gap: 20px; 
              justify-content: center; 
              margin-top: 30px;
            }
            .project-card {
              background: rgba(255, 255, 255, 0.1);
              border-radius: 10px;
              padding: 20px;
              min-width: 250px;
              backdrop-filter: blur(10px);
            }
            .status { 
              color: #4CAF50; 
              font-weight: bold;
            }
            .actions {
              margin-top: 15px;
            }
            .btn {
              background: #4CAF50;
              color: white;
              border: none;
              padding: 8px 16px;
              border-radius: 4px;
              cursor: pointer;
              margin: 0 5px;
            }
            .btn:hover { background: #45a049; }
          </style>
        </head>
        <body>
          <h1>🚀 Silhouette V5.0 - Live Preview</h1>
          <p>The Ultimate Development Platform</p>
          
          <div id="projects" class="project-list">
            <div class="project-card">
              <h3>Welcome</h3>
              <p>Create your first project to see it here!</p>
              <div class="status">Status: Ready</div>
            </div>
          </div>
          
          <script>
            // Connect to WebSocket for real-time updates
            const ws = new WebSocket('ws://localhost:3001');
            
            ws.onopen = function() {
              console.log('Connected to Live Preview WebSocket');
            };
            
            ws.onmessage = function(event) {
              const data = JSON.parse(event.data);
              if (data.type === 'project-update') {
                updateProjectList(data.project);
              }
            };
            
            function updateProjectList(project) {
              console.log('Project update:', project);
            }
          </script>
        </body>
        </html>
      `);
    });
    
    this.staticServer = http.createServer(this.staticApp);
  }

  async setupWebSocketServer() {
    this.wsServer = new WebSocketServer({ 
      port: 3001,
      perMessageDeflate: false
    });
    
    this.wsServer.on('connection', (ws, req) => {
      this.handleWebSocketConnection(ws, req);
    });
    
    console.log('✅ WebSocket server started on port 3001');
  }

  // =============================================================================
  // GESTIÓN DE PROYECTOS
  // =============================================================================
  
  async setupProject(project) {
    console.log(`🔧 Setting up live preview for project: ${project.name}`);
    
    try {
      // Create project-specific directory in static server
      const projectUrl = `/projects/${project.id}`;
      
      // Start preview server for the project
      const serverInfo = await this.startProjectServer(project);
      
      // Setup file watcher for the project
      await this.setupProjectWatcher(project);
      
      // Create WebSocket connections tracking
      this.connections.set(project.id, new Set());
      
      // Register with static server
      this.registerProjectRoute(project, projectUrl);
      
      this.previewServers.set(project.id, {
        project,
        url: projectUrl,
        server: serverInfo,
        port: serverInfo.port,
        status: 'ready',
        startTime: Date.now()
      });
      
      this.emit('projectSetup', { project, url: projectUrl });
      
      console.log(`✅ Live preview ready for project: ${project.name} (${projectUrl})`);
      return projectUrl;
      
    } catch (error) {
      console.error(`❌ Failed to setup live preview for project:`, project.name, error);
      throw error;
    }
  }

  async startProjectServer(project) {
    // Create Express app for the project
    const app = express();
    
    // Serve static files from project
    app.use(express.static(project.path));
    
    // Serve TypeScript transpiled files if needed
    if (project.config.typescript) {
      app.use('/dist', express.static(path.join(project.path, 'dist')));
    }
    
    // Proxy to external servers (e.g., Vite, Webpack dev server)
    if (project.config.proxy) {
      for (const [path, target] of Object.entries(project.config.proxy)) {
        app.use(path, createProxyMiddleware({ target, changeOrigin: true }));
      }
    }
    
    // Fallback to index.html for SPA routes
    app.get('*', (req, res) => {
      res.sendFile(path.join(project.path, 'index.html'));
    });
    
    // Create server
    const server = http.createServer(app);
    const port = await this.getAvailablePort();
    
    return new Promise((resolve, reject) => {
      server.listen(port, 'localhost', (error) => {
        if (error) {
          reject(error);
        } else {
          console.log(`✅ Project server started on port ${port}`);
          resolve({ server, port });
        }
      });
    });
  }

  async setupProjectWatcher(project) {
    const watcher = chokidar.watch(project.path, {
      ignored: (filePath) => this.shouldIgnoreFile(filePath),
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 100
      }
    });
    
    // Setup event handlers
    watcher
      .on('change', (filePath) => this.handleFileChange(project, filePath, 'modified'))
      .on('add', (filePath) => this.handleFileChange(project, filePath, 'added'))
      .on('unlink', (filePath) => this.handleFileChange(project, filePath, 'removed'))
      .on('error', (error) => this.handleWatcherError(project, error));
    
    this.projectWatchers.set(project.id, watcher);
    
    console.log(`👀 File watcher setup for project: ${project.name}`);
  }

  registerProjectRoute(project, url) {
    // Add route to static server
    this.staticApp.use(url, express.static(project.path));
    
    // Notify WebSocket clients
    this.broadcastToProject(project.id, {
      type: 'project-added',
      project: {
        id: project.id,
        name: project.name,
        url: url,
        status: 'ready'
      }
    });
  }

  // =============================================================================
  // GESTIÓN DE CAMBIOS DE ARCHIVOS
  // =============================================================================
  
  async handleFileChange(project, filePath, type) {
    const relativePath = path.relative(project.path, filePath);
    const changeInfo = {
      projectId: project.id,
      filePath: relativePath,
      absolutePath: filePath,
      type: type,
      timestamp: Date.now()
    };
    
    console.log(`📝 File change detected: ${relativePath} (${type})`);
    
    // Add to rebuild queue
    this.rebuildQueue.add(changeInfo);
    
    // Debounced rebuild
    this.debouncedRebuild(project, changeInfo);
    
    // Broadcast change to WebSocket clients
    this.broadcastToProject(project.id, {
      type: 'file-change',
      change: changeInfo
    });
    
    this.emit('fileChange', changeInfo);
  }

  async rebuildProject(project, trigger = 'manual') {
    try {
      console.log(`🔄 Rebuilding project: ${project.name} (trigger: ${trigger})`);
      
      const serverInfo = this.previewServers.get(project.id);
      if (!serverInfo) {
        throw new Error('Preview server not found for project');
      }
      
      // Handle TypeScript compilation
      if (project.config.typescript) {
        await this.compileTypeScript(project);
      }
      
      // Update server configuration if needed
      await this.updateProjectServer(project);
      
      // Broadcast rebuild completion
      this.broadcastToProject(project.id, {
        type: 'rebuild-complete',
        projectId: project.id,
        trigger: trigger,
        timestamp: Date.now()
      });
      
      this.emit('rebuildComplete', { project, trigger });
      
      console.log(`✅ Project rebuilt successfully: ${project.name}`);
      
    } catch (error) {
      console.error(`❌ Failed to rebuild project: ${project.name}`, error);
      
      this.broadcastToProject(project.id, {
        type: 'rebuild-error',
        projectId: project.id,
        error: error.message,
        timestamp: Date.now()
      });
      
      this.emit('rebuildError', { project, error });
    }
  }

  async compileTypeScript(project) {
    try {
      const tsconfigPath = path.join(project.path, 'tsconfig.json');
      await execAsync('npx tsc', { cwd: project.path });
      console.log('✅ TypeScript compilation successful');
    } catch (error) {
      console.warn('⚠️ TypeScript compilation failed:', error.message);
      // Don't fail the build, just log the warning
    }
  }

  async updateProjectServer(project) {
    const serverInfo = this.previewServers.get(project.id);
    if (serverInfo) {
      // This could be used to restart the server or update configuration
      // For now, we'll just log that an update was requested
      this.emit('serverUpdate', { project, server: serverInfo.server });
    }
  }

  // =============================================================================
  // WEBSOCKET MANAGEMENT
  // =============================================================================
  
  handleWebSocketConnection(ws, req) {
    const url = new URL(req.url, 'http://localhost');
    const projectId = url.searchParams.get('project');
    
    if (projectId) {
      // Project-specific connection
      if (!this.connections.has(projectId)) {
        this.connections.set(projectId, new Set());
      }
      
      this.connections.get(projectId).add(ws);
      
      // Send initial project state
      const projectServer = this.previewServers.get(projectId);
      if (projectServer) {
        ws.send(JSON.stringify({
          type: 'project-state',
          project: {
            id: projectId,
            url: projectServer.url,
            status: projectServer.status,
            port: projectServer.port
          }
        }));
      }
      
      console.log(`🔌 WebSocket client connected to project: ${projectId}`);
      
    } else {
      // Global connection
      console.log('🔌 WebSocket client connected (global)');
      
      // Send list of all active projects
      const projects = Array.from(this.previewServers.entries()).map(([id, info]) => ({
        id,
        name: info.project.name,
        url: info.url,
        status: info.status
      }));
      
      ws.send(JSON.stringify({
        type: 'projects-list',
        projects: projects
      }));
    }
    
    // Handle disconnection
    ws.on('close', () => {
      if (projectId) {
        const conns = this.connections.get(projectId);
        if (conns) {
          conns.delete(ws);
        }
        console.log(`🔌 WebSocket client disconnected from project: ${projectId}`);
      } else {
        console.log('🔌 WebSocket client disconnected (global)');
      }
    });
  }

  broadcastToProject(projectId, message) {
    const conns = this.connections.get(projectId);
    if (conns) {
      const messageStr = JSON.stringify(message);
      for (const ws of conns) {
        if (ws.readyState === ws.OPEN) {
          ws.send(messageStr);
        }
      }
    }
  }

  broadcastGlobal(message) {
    for (const conns of this.connections.values()) {
      const messageStr = JSON.stringify(message);
      for (const ws of conns) {
        if (ws.readyState === ws.OPEN) {
          ws.send(messageStr);
        }
      }
    }
  }

  // =============================================================================
  // PREVIEW CONTROL
  // =============================================================================
  
  async startPreview(project) {
    try {
      const projectUrl = await this.setupProject(project);
      
      this.broadcastToProject(project.id, {
        type: 'preview-started',
        projectId: project.id,
        url: projectUrl,
        timestamp: Date.now()
      });
      
      this.emit('previewStarted', { project, url: projectUrl });
      return projectUrl;
      
    } catch (error) {
      console.error(`❌ Failed to start preview for project:`, project.name, error);
      this.emit('previewError', { project, error });
      throw error;
    }
  }

  async stopPreview(projectId) {
    try {
      // Stop project watcher
      const watcher = this.projectWatchers.get(projectId);
      if (watcher) {
        await watcher.close();
        this.projectWatchers.delete(projectId);
      }
      
      // Close WebSocket connections
      const conns = this.connections.get(projectId);
      if (conns) {
        for (const ws of conns) {
          ws.close();
        }
        this.connections.delete(projectId);
      }
      
      // Stop server if it was created
      const serverInfo = this.previewServers.get(projectId);
      if (serverInfo && serverInfo.server) {
        serverInfo.server.close();
      }
      
      // Remove from preview servers
      this.previewServers.delete(projectId);
      
      this.broadcastGlobal({
        type: 'preview-stopped',
        projectId: projectId,
        timestamp: Date.now()
      });
      
      this.emit('previewStopped', { projectId });
      console.log(`🛑 Preview stopped for project: ${projectId}`);
      
    } catch (error) {
      console.error(`❌ Failed to stop preview for project:`, projectId, error);
      throw error;
    }
  }

  // =============================================================================
  // UTILIDADES
  // =============================================================================
  
  shouldIgnoreFile(filePath) {
    const normalizedPath = filePath.replace(/\\/g, '/');
    
    // Check exclude patterns
    for (const pattern of this.watchPatterns.exclude) {
      if (normalizedPath.includes(pattern)) {
        return true;
      }
    }
    
    // Check for node_modules
    if (normalizedPath.includes('node_modules')) return true;
    if (normalizedPath.includes('dist')) return true;
    if (normalizedPath.includes('build')) return true;
    if (normalizedPath.includes('.git')) return true;
    
    // Check for temporary files
    if (normalizedPath.includes('.tmp') || normalizedPath.includes('.swp')) {
      return true;
    }
    
    return false;
  }

  async getAvailablePort() {
    const server = require('net').createServer();
    
    return new Promise((resolve, reject) => {
      server.listen(0, 'localhost', () => {
        const port = server.address().port;
        server.close(() => resolve(port));
      });
      server.on('error', reject);
    });
  }

  debouncedRebuild(project, changeInfo) {
    // Clear existing timeout
    if (this.rebuildTimeouts && this.rebuildTimeouts[project.id]) {
      clearTimeout(this.rebuildTimeouts[project.id]);
    }
    
    // Set new timeout
    this.rebuildTimeouts = this.rebuildTimeouts || {};
    this.rebuildTimeouts[project.id] = setTimeout(() => {
      this.rebuildProject(project, 'file-change');
    }, this.rebuildConfig.debounceTime);
  }

  handleWatcherError(project, error) {
    console.error(`❌ Watcher error for project ${project.name}:`, error);
    
    this.broadcastToProject(project.id, {
      type: 'watcher-error',
      projectId: project.id,
      error: error.message,
      timestamp: Date.now()
    });
  }

  getProjectsPath() {
    return path.join(process.env.HOME || process.env.USERPROFILE || '/tmp', 'Silhouette-V5-Workspace');
  }

  // =============================================================================
  // CLEANUP
  // =============================================================================
  
  async dispose() {
    // Stop all project watchers
    for (const [projectId, watcher] of this.projectWatchers) {
      await watcher.close();
    }
    
    // Close all WebSocket connections
    for (const conns of this.connections.values()) {
      for (const ws of conns) {
        ws.close();
      }
    }
    
    // Stop all preview servers
    for (const serverInfo of this.previewServers.values()) {
      if (serverInfo.server) {
        serverInfo.server.close();
      }
    }
    
    // Stop global servers
    if (this.staticServer) {
      this.staticServer.close();
    }
    
    if (this.wsServer) {
      this.wsServer.close();
    }
    
    this.previewServers.clear();
    this.projectWatchers.clear();
    this.connections.clear();
    this.rebuildQueue.clear();
    
    console.log('🗑️ Live Preview System disposed');
  }
}

export { LivePreview };
