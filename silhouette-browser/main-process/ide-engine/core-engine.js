// =============================================================================
// SILHOUETTE V5.0 - CORE IDE ENGINE
// Motor principal de la plataforma de desarrollo más avanzada del mundo
// =============================================================================

import { EventEmitter } from 'events';
import * as path from 'path';
import * as fs from 'fs/promises';
import { SecuritySandbox } from '../sandbox-system/security-sandbox.js';
import { FileSystemManager } from '../file-system/virtual-fs.js';
import { LivePreview } from '../live-preview/live-preview.js';
import { MonacoIntegration } from './monaco-integration.js';
import { LanguageServerManager } from './language-server.js';

class CoreIDEEngine extends EventEmitter {
  constructor() {
    super();
    this.projects = new Map();
    this.activeProject = null;
    this.workspaces = new Map();
    this.pluginRegistry = new Map();
    
    // Core components
    this.securitySandbox = new SecuritySandbox();
    this.fileSystem = new FileSystemManager();
    this.livePreview = new LivePreview();
    this.monacoIntegration = new MonacoIntegration();
    this.languageServer = new LanguageServerManager();
    
    this.isInitialized = false;
  }

  // =============================================================================
  // INICIALIZACIÓN DEL MOTOR
  // =============================================================================
  
  async initialize() {
    console.log('🚀 Initializing Silhouette V5.0 Core IDE Engine...');
    
    try {
      // Initialize security sandbox
      await this.securitySandbox.initialize();
      console.log('✅ Security Sandbox initialized');
      
      // Initialize file system
      await this.fileSystem.initialize();
      console.log('✅ Virtual File System initialized');
      
      // Initialize live preview
      await this.livePreview.initialize();
      console.log('✅ Live Preview System initialized');
      
      // Initialize Monaco integration
      await this.monacoIntegration.initialize();
      console.log('✅ Monaco Editor Integration initialized');
      
      // Initialize language servers
      await this.languageServer.initialize();
      console.log('✅ Language Server Manager initialized');
      
      // Setup event listeners
      this.setupEventHandlers();
      
      this.isInitialized = true;
      console.log('✅ Silhouette V5.0 Core IDE Engine ready!');
      
      this.emit('initialized');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to initialize Core IDE Engine:', error);
      return false;
    }
  }

  setupEventHandlers() {
    // File system events
    this.fileSystem.on('fileChanged', async (fileChange) => {
      await this.handleFileChange(fileChange);
    });
    
    // Live preview events
    this.livePreview.on('rebuildTriggered', async (rebuildInfo) => {
      await this.handleRebuild(rebuildInfo);
    });
    
    // Monaco events
    this.monacoIntegration.on('codeGenerated', async (codeInfo) => {
      await this.handleCodeGeneration(codeInfo);
    });
  }

  // =============================================================================
  // GESTIÓN DE PROYECTOS
  // =============================================================================
  
  async createProject(config) {
    console.log(`🔧 Creating new project: ${config.name}`);
    
    const projectId = `project-${Date.now()}`;
    const projectPath = path.join(this.securitySandbox.getWorkspacePath(), config.name);
    
    // Create project structure
    const project = {
      id: projectId,
      name: config.name,
      type: config.type || 'web',
      path: projectPath,
      config: config,
      createdAt: Date.now(),
      modifiedAt: Date.now(),
      status: 'creating',
      files: new Map(),
      dependencies: config.dependencies || [],
      ports: new Set(),
      services: new Map()
    };
    
    try {
      // Setup project in sandbox
      await this.securitySandbox.createProjectSpace(projectPath);
      
      // Create base files
      await this.createProjectFiles(project, config);
      
      // Initialize Git repository
      if (config.git !== false) {
        await this.initializeGitRepository(project);
      }
      
      // Setup live preview
      await this.livePreview.setupProject(project);
      
      // Register project
      this.projects.set(projectId, project);
      this.activeProject = projectId;
      
      project.status = 'ready';
      this.emit('projectCreated', project);
      
      console.log(`✅ Project ${config.name} created successfully`);
      return project;
      
    } catch (error) {
      console.error(`❌ Failed to create project ${config.name}:`, error);
      project.status = 'error';
      project.error = error.message;
      throw error;
    }
  }

  async createProjectFiles(project, config) {
    const files = [];
    
    // Package.json
    if (config.type === 'web' || config.type === 'node' || config.type === 'react' || config.type === 'vue') {
      files.push({
        path: 'package.json',
        content: this.generatePackageJson(config)
      });
    }
    
    // HTML template
    if (config.type === 'web' || config.type === 'react' || config.type === 'vue') {
      files.push({
        path: 'index.html',
        content: this.generateHtmlTemplate(config)
      });
    }
    
    // Main JS/TS file
    if (config.type === 'web' || config.type === 'react' || config.type === 'vue') {
      files.push({
        path: config.typescript ? 'src/main.ts' : 'src/main.js',
        content: this.generateMainFile(config)
      });
    }
    
    // CSS/Styling
    if (config.type !== 'node') {
      files.push({
        path: config.typescript ? 'src/main.css' : 'src/style.css',
        content: this.generateCSS(config)
      });
    }
    
    // GitIgnore
    files.push({
      path: '.gitignore',
      content: this.generateGitIgnore(config)
    });
    
    // README
    files.push({
      path: 'README.md',
      content: this.generateReadme(config)
    });
    
    // Write all files
    for (const file of files) {
      const fullPath = path.join(project.path, file.path);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, file.content);
      
      project.files.set(file.path, {
        path: file.path,
        fullPath: fullPath,
        content: file.content,
        type: this.getFileType(file.path)
      });
    }
  }

  // =============================================================================
  // GESTIÓN DE ARCHIVOS
  // =============================================================================
  
  async openFile(filePath) {
    const project = this.getActiveProject();
    if (!project) throw new Error('No active project');
    
    const file = project.files.get(filePath);
    if (!file) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    // Read file content
    const content = await fs.readFile(file.fullPath, 'utf-8');
    file.content = content;
    file.lastOpened = Date.now();
    
    this.emit('fileOpened', { file, project });
    return file;
  }

  async saveFile(filePath, content) {
    const project = this.getActiveProject();
    if (!project) throw new Error('No active project');
    
    const file = project.files.get(filePath);
    if (!file) throw new Error(`File not found: ${filePath}`);
    
    // Write to sandbox
    await fs.writeFile(file.fullPath, content);
    
    // Update in-memory state
    file.content = content;
    file.modifiedAt = Date.now();
    project.modifiedAt = Date.now();
    
    // Notify file system watcher
    this.fileSystem.emitChange(file.fullPath, 'modified');
    
    // Update Monaco editor
    this.monacoIntegration.updateFile(filePath, content);
    
    this.emit('fileSaved', { file, project });
    return file;
  }

  async createFile(filePath, content = '') {
    const project = this.getActiveProject();
    if (!project) throw new Error('No active project');
    
    const fullPath = path.join(project.path, filePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content);
    
    const file = {
      path: filePath,
      fullPath: fullPath,
      content: content,
      type: this.getFileType(filePath),
      createdAt: Date.now(),
      modifiedAt: Date.now()
    };
    
    project.files.set(filePath, file);
    project.modifiedAt = Date.now();
    
    this.emit('fileCreated', { file, project });
    return file;
  }

  async deleteFile(filePath) {
    const project = this.getActiveProject();
    if (!project) throw new Error('No active project');
    
    const file = project.files.get(filePath);
    if (!file) throw new Error(`File not found: ${filePath}`);
    
    await fs.unlink(file.fullPath);
    project.files.delete(filePath);
    project.modifiedAt = Date.now();
    
    this.emit('fileDeleted', { file, project });
  }

  // =============================================================================
  // GESTIÓN DE VISTA PREVIA
  // =============================================================================
  
  async startPreview() {
    const project = this.getActiveProject();
    if (!project) throw new Error('No active project');
    
    const previewUrl = await this.livePreview.startPreview(project);
    this.emit('previewStarted', { project, url: previewUrl });
    return previewUrl;
  }

  async stopPreview() {
    const project = this.getActiveProject();
    if (!project) return;
    
    await this.livePreview.stopPreview(project);
    this.emit('previewStopped', { project });
  }

  // =============================================================================
  // GESTIÓN DE LENGUAJES
  // =============================================================================
  
  async analyzeCode(filePath) {
    const file = this.getFileByPath(filePath);
    if (!file) throw new Error('File not found');
    
    return await this.languageServer.analyzeCode(file);
  }

  async getSuggestions(filePath, position) {
    const file = this.getFileByPath(filePath);
    if (!file) throw new Error('File not found');
    
    return await this.languageServer.getSuggestions(file, position);
  }

  async formatCode(filePath) {
    const file = this.getFileByPath(filePath);
    if (!file) throw new Error('File not found');
    
    return await this.languageServer.formatCode(file);
  }

  // =============================================================================
  // EVENT HANDLERS
  // =============================================================================
  
  async handleFileChange(fileChange) {
    const project = this.getProjectByFile(fileChange.path);
    if (!project) return;
    
    // Check if file belongs to active project
    if (project.id !== this.activeProject) {
      return; // Don't preview files from other projects
    }
    
    // Trigger live preview rebuild
    await this.livePreview.handleFileChange(fileChange);
    
    // Update language services
    await this.languageServer.updateFile(fileChange.path);
    
    this.emit('fileChange', { fileChange, project });
  }

  async handleRebuild(rebuildInfo) {
    console.log('🔄 Rebuild triggered for project:', rebuildInfo.project.name);
    
    const project = this.projects.get(rebuildInfo.projectId);
    if (project) {
      this.emit('rebuildComplete', { project, info: rebuildInfo });
    }
  }

  async handleCodeGeneration(codeInfo) {
    console.log('🤖 Code generated:', codeInfo.type);
    
    const project = this.getActiveProject();
    if (project) {
      this.emit('codeGenerated', { project, info: codeInfo });
    }
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================
  
  getActiveProject() {
    if (!this.activeProject) return null;
    return this.projects.get(this.activeProject) || null;
  }

  getProjectByFile(filePath) {
    for (const project of this.projects.values()) {
      if (filePath.startsWith(project.path)) {
        return project;
      }
    }
    return null;
  }

  getFileByPath(filePath) {
    const project = this.getActiveProject();
    if (!project) return null;
    return project.files.get(filePath) || null;
  }

  getFileType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const typeMap = {
      '.js': 'javascript',
      '.ts': 'typescript',
      '.jsx': 'javascript',
      '.tsx': 'typescript',
      '.html': 'html',
      '.css': 'css',
      '.scss': 'scss',
      '.sass': 'sass',
      '.json': 'json',
      '.xml': 'xml',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.md': 'markdown',
      '.py': 'python',
      '.java': 'java',
      '.cpp': 'cpp',
      '.c': 'c',
      '.cs': 'csharp',
      '.go': 'go',
      '.rs': 'rust',
      '.php': 'php',
      '.rb': 'ruby',
      '.swift': 'swift',
      '.kt': 'kotlin',
      '.vue': 'vue',
      '.svelte': 'svelte'
    };
    return typeMap[ext] || 'text';
  }

  // =============================================================================
  // TEMPLATE GENERATORS
  // =============================================================================
  
  generatePackageJson(config) {
    const base = {
      name: config.name.toLowerCase().replace(/\s+/g, '-'),
      version: '1.0.0',
      description: `Project created with Silhouette V5.0 - ${config.name}`,
      main: config.typescript ? 'dist/main.js' : 'src/main.js',
      scripts: {
        dev: config.type === 'node' ? 'node src/main.js' : 'live-server --port=3000 --open=index.html',
        start: config.type === 'node' ? 'node src/main.js' : 'serve -s dist',
        build: config.typescript ? 'tsc' : 'echo "No build needed"',
        'silhouette': 'Silhouette V5.0 generated project'
      }
    };

    if (config.type === 'react') {
      base.dependencies = {
        react: '^18.0.0',
        'react-dom': '^18.0.0'
      };
      base.devDependencies = {
        'live-server': '^1.2.0',
        ...(config.typescript ? { typescript: '^5.0.0' } : {})
      };
    } else if (config.type === 'vue') {
      base.dependencies = {
        vue: '^3.0.0'
      };
      base.devDependencies = {
        'live-server': '^1.2.0',
        ...(config.typescript ? { typescript: '^5.0.0' } : {})
      };
    } else if (config.type === 'node') {
      base.dependencies = config.dependencies || {};
      base.devDependencies = {
        nodemon: '^2.0.0',
        ...(config.typescript ? { typescript: '^5.0.0' } : {})
      };
    } else {
      // Web project
      base.devDependencies = {
        'live-server': '^1.2.0'
      };
    }

    return JSON.stringify(base, null, 2);
  }

  generateHtmlTemplate(config) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${config.name} - Silhouette V5.0</title>
    <link rel="stylesheet" href="${config.typescript ? 'src/main.css' : 'src/style.css'}">
</head>
<body>
    <div id="app">
        <h1>🚀 ${config.name}</h1>
        <p>Created with Silhouette V5.0 - The Ultimate Development Platform</p>
    </div>
    
    ${config.type === 'react' ? '<div id="root"></div>' : ''}
    ${config.type === 'vue' ? '<div id="app-mount"></div>' : ''}
    
    <script src="${config.typescript ? 'dist/main.js' : 'src/main.js'}"></script>
</body>
</html>`;
  }

  generateMainFile(config) {
    if (config.type === 'react' && config.typescript) {
      return `import React from 'react';
import ReactDOM from 'react-dom/client';

const App = () => {
  return (
    <div>
      <h1>🚀 ${config.name}</h1>
      <p>React app created with Silhouette V5.0 and TypeScript</p>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);`;
    }
    
    if (config.type === 'react') {
      return `import React from 'react';
import ReactDOM from 'react-dom/client';

const App = () => {
  return (
    <div>
      <h1>🚀 ${config.name}</h1>
      <p>React app created with Silhouette V5.0</p>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(<App />);`;
    }
    
    if (config.type === 'vue' && config.typescript) {
      return `import { createApp } from 'vue';

const App = {
  template: \`
    <div>
      <h1>🚀 ${config.name}</h1>
      <p>Vue.js app created with Silhouette V5.0 and TypeScript</p>
    </div>
  \`
};

createApp(App).mount('#app-mount');`;
    }
    
    if (config.type === 'vue') {
      return `import { createApp } from 'vue';

const App = {
  template: \`
    <div>
      <h1>🚀 ${config.name}</h1>
      <p>Vue.js app created with Silhouette V5.0</p>
    </div>
  \`
};

createApp(App).mount('#app-mount');`;
    }
    
    if (config.type === 'node') {
      return `console.log('🚀 ${config.name}');
console.log('Node.js app created with Silhouette V5.0');

${config.typescript ? '// TypeScript compilation will be done automatically' : ''}

// Your application logic here`;
    }
    
    // Web project
    return `console.log('🚀 ${config.name}');
console.log('Web project created with Silhouette V5.0');

// Your application logic here`;
  }

  generateCSS(config) {
    return `/* ${config.name} - Created with Silhouette V5.0 */

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.6;
  color: #333;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  padding: 20px;
}

#app {
  max-width: 800px;
  margin: 0 auto;
  background: white;
  border-radius: 15px;
  padding: 40px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
}

h1 {
  color: #2c3e50;
  margin-bottom: 20px;
  text-align: center;
}

p {
  text-align: center;
  font-size: 18px;
  color: #7f8c8d;
}

#root, #app-mount {
  margin-top: 20px;
}

/* Responsive design */
@media (max-width: 768px) {
  #app {
    margin: 10px;
    padding: 20px;
  }
  
  h1 {
    font-size: 24px;
  }
  
  p {
    font-size: 16px;
  }
}`;
  }

  generateGitIgnore(config) {
    let ignores = [
      '# Silhouette V5.0 generated',
      'node_modules/',
      'dist/',
      'build/',
      '.DS_Store',
      '*.log',
      '.env',
      '.env.local'
    ];
    
    if (config.typescript) {
      ignores.push('*.tsbuildinfo');
    }
    
    if (config.type === 'node') {
      ignores.push('*.pid');
      ignores.push('npm-debug.log*');
    }
    
    return ignores.join('\n');
  }

  generateReadme(config) {
    return `# ${config.name}

Generated with **Silhouette V5.0** - The Ultimate Development Platform

## 🚀 Quick Start

${config.type === 'node' ? 
```\`\`\`bash
npm install
npm run dev
\`\`\`` :
```\`\`\`bash
npm install
npm run dev
\`\`\`

Then open your browser to http://localhost:3000
\`\`\``}

## 📁 Project Structure

\`\`\`
${config.name}/
├── ${config.typescript ? 'dist/          # Compiled files' : ''}
├── node_modules/     # Dependencies
├── src/              # Source code
├── index.html        # Main HTML file
├── package.json      # Project configuration
└── README.md         # This file
\`\`\`

## 🔧 Development

This project is configured to work seamlessly with Silhouette V5.0 IDE features:

- **Live Preview**: Changes are reflected instantly
- **Auto-reload**: No need to refresh manually
- **Terminal Integration**: Use built-in terminal for commands
- **Git Integration**: Full version control support
- **Sandbox Security**: Safe development environment

## 📝 Technologies

${config.type === 'react' ? '- React.js\n' : ''}${config.type === 'vue' ? '- Vue.js\n' : ''}${config.typescript ? '- TypeScript\n' : 'JavaScript'}\n- HTML5 & CSS3\n- Silhouette V5.0 Platform

## 🤖 AI-Powered Development

This project was created using Silhouette's advanced AI teams:
- Code generation and optimization
- Security analysis
- Performance recommendations
- Best practices enforcement

---

**Built with ❤️ by Silhouette V5.0**
*The most advanced development platform in the world*`;
  }

  async initializeGitRepository(project) {
    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      
      await execAsync('git init', { cwd: project.path });
      await execAsync('git add .', { cwd: project.path });
      await execAsync('git commit -m "Initial commit: Project created with Silhouette V5.0"', { cwd: project.path });
      
      console.log('✅ Git repository initialized for project:', project.name);
    } catch (error) {
      console.warn('⚠️ Git initialization failed:', error.message);
    }
  }
}

export { CoreIDEEngine };
