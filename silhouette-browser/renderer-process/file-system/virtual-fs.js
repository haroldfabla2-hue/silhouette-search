// =============================================================================
// SILHOUETTE V5.0 - VIRTUAL FILE SYSTEM
// Sistema de archivos virtual con monitoreo y hot reload
// =============================================================================

import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as chokidar from 'chokidar';

class FileSystemManager extends EventEmitter {
  constructor() {
    super();
    this.watcher = null;
    this.fileMap = new Map(); // Virtual file registry
    this.watchers = new Map(); // File-specific watchers
    this.fileHistory = new Map(); // Undo/redo history
    this.tempFiles = new Set(); // Temporary files cleanup
    this.ignorePatterns = new Set([
      'node_modules',
      '.git',
      'dist',
      'build',
      '.DS_Store',
      '*.log',
      '.env',
      'coverage',
      '.nyc_output'
    ]);
    this.isInitialized = false;
  }

  // =============================================================================
  // INICIALIZACIÓN
  // =============================================================================
  
  async initialize() {
    console.log('📁 Initializing Virtual File System...');
    
    try {
      // Setup main file watcher
      this.watcher = chokidar.watch('**/*', {
        ignored: (filePath) => this.shouldIgnore(filePath),
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: {
          stabilityThreshold: 100,
          pollInterval: 100
        }
      });
      
      // Setup event handlers
      this.setupWatcherEvents();
      
      // Initialize cleanup for temp files
      this.setupCleanupTimer();
      
      this.isInitialized = true;
      console.log('✅ Virtual File System initialized');
      
      this.emit('initialized');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to initialize File System:', error);
      return false;
    }
  }

  setupWatcherEvents() {
    this.watcher
      .on('add', (filePath) => this.handleFileAdded(filePath))
      .on('change', (filePath) => this.handleFileChanged(filePath))
      .on('unlink', (filePath) => this.handleFileRemoved(filePath))
      .on('addDir', (dirPath) => this.handleDirectoryAdded(dirPath))
      .on('unlinkDir', (dirPath) => this.handleDirectoryRemoved(dirPath))
      .on('error', (error) => this.handleWatcherError(error))
      .on('ready', () => {
        console.log('✅ File watcher ready');
        this.emit('watcherReady');
      });
  }

  setupCleanupTimer() {
    // Clean up temp files every 10 minutes
    setInterval(() => {
      this.cleanupTempFiles();
    }, 10 * 60 * 1000);
  }

  // =============================================================================
  // GESTIÓN DE ARCHIVOS
  // =============================================================================
  
  async readFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      
      // Cache file in virtual file system
      this.fileMap.set(filePath, {
        content,
        lastModified: Date.now(),
        size: content.length,
        type: this.getFileType(filePath)
      });
      
      return content;
      
    } catch (error) {
      console.error(`❌ Failed to read file ${filePath}:`, error);
      throw error;
    }
  }

  async writeFile(filePath, content, options = {}) {
    const timestamp = Date.now();
    
    try {
      // Create directory if it doesn't exist
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      
      // Save to history for undo/redo
      await this.saveToHistory(filePath, content);
      
      // Write file
      await fs.writeFile(filePath, content, { encoding: 'utf-8', ...options });
      
      // Update virtual file system
      this.fileMap.set(filePath, {
        content,
        lastModified: timestamp,
        size: content.length,
        type: this.getFileType(filePath)
      });
      
      // Emit change event
      this.emit('fileChanged', {
        path: filePath,
        type: 'modified',
        timestamp,
        size: content.length
      });
      
      return true;
      
    } catch (error) {
      console.error(`❌ Failed to write file ${filePath}:`, error);
      throw error;
    }
  }

  async createFile(filePath, template = '') {
    const content = template || this.getDefaultTemplate(filePath);
    
    try {
      await this.writeFile(filePath, content);
      
      // Start watching this specific file
      this.watchFile(filePath);
      
      this.emit('fileCreated', {
        path: filePath,
        timestamp: Date.now()
      });
      
      return true;
      
    } catch (error) {
      console.error(`❌ Failed to create file ${filePath}:`, error);
      throw error;
    }
  }

  async deleteFile(filePath) {
    try {
      await fs.unlink(filePath);
      
      // Remove from virtual file system
      this.fileMap.delete(filePath);
      this.watchers.delete(filePath);
      
      this.emit('fileDeleted', {
        path: filePath,
        timestamp: Date.now()
      });
      
      return true;
      
    } catch (error) {
      console.error(`❌ Failed to delete file ${filePath}:`, error);
      throw error;
    }
  }

  async copyFile(sourcePath, destPath) {
    try {
      const content = await this.readFile(sourcePath);
      await this.writeFile(destPath, content);
      
      this.emit('fileCopied', {
        source: sourcePath,
        destination: destPath,
        timestamp: Date.now()
      });
      
      return true;
      
    } catch (error) {
      console.error(`❌ Failed to copy file ${sourcePath} to ${destPath}:`, error);
      throw error;
    }
  }

  async moveFile(sourcePath, destPath) {
    try {
      const content = await this.readFile(sourcePath);
      await this.writeFile(destPath, content);
      await this.deleteFile(sourcePath);
      
      this.emit('fileMoved', {
        source: sourcePath,
        destination: destPath,
        timestamp: Date.now()
      });
      
      return true;
      
    } catch (error) {
      console.error(`❌ Failed to move file ${sourcePath} to ${destPath}:`, error);
      throw error;
    }
  }

  // =============================================================================
  // GESTIÓN DE DIRECTORIOS
  // =============================================================================
  
  async createDirectory(dirPath) {
    try {
      await fs.mkdir(dirPath, { recursive: true });
      
      // Start watching directory
      this.watchFile(dirPath);
      
      this.emit('directoryCreated', {
        path: dirPath,
        timestamp: Date.now()
      });
      
      return true;
      
    } catch (error) {
      console.error(`❌ Failed to create directory ${dirPath}:`, error);
      throw error;
    }
  }

  async deleteDirectory(dirPath, recursive = true) {
    try {
      await fs.rm(dirPath, { recursive });
      
      // Clean up watchers
      for (const [watchPath, watcher] of this.watchers) {
        if (watchPath.startsWith(dirPath)) {
          await watcher.close();
          this.watchers.delete(watchPath);
        }
      }
      
      this.emit('directoryDeleted', {
        path: dirPath,
        timestamp: Date.now()
      });
      
      return true;
      
    } catch (error) {
      console.error(`❌ Failed to delete directory ${dirPath}:`, error);
      throw error;
    }
  }

  async listDirectory(dirPath) {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      const files = [];
      for (const entry of entries) {
        if (this.shouldIgnore(entry.name)) continue;
        
        const fullPath = path.join(dirPath, entry.name);
        const stats = await fs.stat(fullPath);
        
        files.push({
          name: entry.name,
          path: fullPath,
          type: entry.isDirectory() ? 'directory' : 'file',
          size: stats.size,
          modified: stats.mtime,
          created: stats.ctime
        });
      }
      
      return files;
      
    } catch (error) {
      console.error(`❌ Failed to list directory ${dirPath}:`, error);
      throw error;
    }
  }

  // =============================================================================
  // SISTEMA DE ARCHIVOS VIRTUAL
  // =============================================================================
  
  getFileInfo(filePath) {
    return this.fileMap.get(filePath) || null;
  }

  getAllFiles() {
    return Array.from(this.fileMap.keys());
  }

  searchFiles(query, options = {}) {
    const results = [];
    const { type, extension, caseSensitive = false } = options;
    
    for (const [filePath, fileInfo] of this.fileMap) {
      let matches = true;
      
      // Text search
      if (query) {
        const searchIn = caseSensitive ? filePath : filePath.toLowerCase();
        const queryText = caseSensitive ? query : query.toLowerCase();
        matches = searchIn.includes(queryText);
      }
      
      // Type filter
      if (matches && type && fileInfo.type !== type) {
        matches = false;
      }
      
      // Extension filter
      if (matches && extension && !filePath.endsWith(`.${extension}`)) {
        matches = false;
      }
      
      if (matches) {
        results.push({
          path: filePath,
          ...fileInfo
        });
      }
    }
    
    return results;
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
      '.less': 'less',
      '.json': 'json',
      '.xml': 'xml',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.md': 'markdown',
      '.txt': 'text',
      '.py': 'python',
      '.java': 'java',
      '.cpp': 'cpp',
      '.c': 'c',
      '.h': 'c',
      '.hpp': 'cpp',
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

  getDefaultTemplate(filePath) {
    const type = this.getFileType(filePath);
    const fileName = path.basename(filePath);
    
    const templates = {
      'javascript': `// ${fileName}
// Created with Silhouette V5.0

console.log('Hello from ${fileName}!');`,

      'typescript': `// ${fileName}
// Created with Silhouette V5.0

console.log('Hello from ${fileName}!');`,

      'html': `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${fileName}</title>
</head>
<body>
    <h1>${fileName}</h1>
    <p>Created with Silhouette V5.0</p>
</body>
</html>`,

      'css': `/* ${fileName} */
/* Created with Silhouette V5.0 */

body {
  font-family: Arial, sans-serif;
  margin: 20px;
}

h1 {
  color: #333;
}`,

      'json': `{
  "name": "project",
  "version": "1.0.0",
  "description": "Created with Silhouette V5.0"
}`,

      'markdown': `# ${fileName}

Created with **Silhouette V5.0** - The Ultimate Development Platform

## Description

[Your content here]`,

      'python': `# ${fileName}
# Created with Silhouette V5.0

def main():
    print("Hello from ${fileName}!")

if __name__ == "__main__":
    main()`
    };
    
    return templates[type] || `// ${fileName}\n// Created with Silhouette V5.0\n`;
  }

  // =============================================================================
  // WATCHERS Y MONITOREO
  // =============================================================================
  
  watchFile(filePath) {
    if (this.watchers.has(filePath)) {
      return; // Already being watched
    }
    
    const watcher = chokidar.watch(filePath, {
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 100
      }
    });
    
    watcher
      .on('change', (changedPath) => {
        this.handleFileChanged(changedPath);
      })
      .on('unlink', (removedPath) => {
        this.handleFileRemoved(removedPath);
      })
      .on('error', (error) => {
        console.error(`❌ Watcher error for ${filePath}:`, error);
      });
    
    this.watchers.set(filePath, watcher);
  }

  unwatchFile(filePath) {
    const watcher = this.watchers.get(filePath);
    if (watcher) {
      watcher.close();
      this.watchers.delete(filePath);
    }
  }

  // =============================================================================
  // HISTORIAL Y DESHACER
  // =============================================================================
  
  async saveToHistory(filePath, content) {
    const history = this.fileHistory.get(filePath) || [];
    
    history.push({
      content,
      timestamp: Date.now()
    });
    
    // Keep only last 50 versions
    if (history.length > 50) {
      history.shift();
    }
    
    this.fileHistory.set(filePath, history);
  }

  async undo(filePath) {
    const history = this.fileHistory.get(filePath);
    if (!history || history.length < 2) {
      return null;
    }
    
    // Pop current version
    history.pop();
    
    // Get previous version
    const previousContent = history[history.length - 1].content;
    
    await this.writeFile(filePath, previousContent);
    
    return previousContent;
  }

  async redo(filePath) {
    const history = this.fileHistory.get(filePath);
    if (!history || history.length === 0) {
      return null;
    }
    
    // This is a simplified redo - in practice, you'd need to track forward history
    const latestContent = history[history.length - 1].content;
    await this.writeFile(filePath, latestContent);
    
    return latestContent;
  }

  getHistory(filePath, limit = 20) {
    const history = this.fileHistory.get(filePath);
    return history ? history.slice(-limit) : [];
  }

  // =============================================================================
  // EVENT HANDLERS
  // =============================================================================
  
  handleFileAdded(filePath) {
    this.emitChange(filePath, 'added');
  }

  handleFileChanged(filePath) {
    this.emitChange(filePath, 'modified');
  }

  handleFileRemoved(filePath) {
    this.fileMap.delete(filePath);
    this.watchers.delete(filePath);
    
    this.emit('fileDeleted', {
      path: filePath,
      timestamp: Date.now()
    });
  }

  handleDirectoryAdded(dirPath) {
    // Add directory to watch list
    this.watcher.add(dirPath);
    
    this.emit('directoryCreated', {
      path: dirPath,
      timestamp: Date.now()
    });
  }

  handleDirectoryRemoved(dirPath) {
    // Clean up watchers
    for (const [watchPath, watcher] of this.watchers) {
      if (watchPath.startsWith(dirPath)) {
        watcher.close();
        this.watchers.delete(watchPath);
      }
    }
    
    this.emit('directoryDeleted', {
      path: dirPath,
      timestamp: Date.now()
    });
  }

  handleWatcherError(error) {
    console.error('❌ File watcher error:', error);
    this.emit('watcherError', { error });
  }

  emitChange(filePath, type) {
    // Update file info
    this.getFileInfo(filePath).lastModified = Date.now();
    
    this.emit('fileChanged', {
      path: filePath,
      type,
      timestamp: Date.now()
    });
  }

  // =============================================================================
  // UTILIDADES
  // =============================================================================
  
  shouldIgnore(filePath) {
    const normalized = filePath.replace(/\\/g, '/');
    
    // Check ignore patterns
    for (const pattern of this.ignorePatterns) {
      if (normalized.includes(pattern) || normalized.endsWith(pattern)) {
        return true;
      }
    }
    
    // Check for hidden files/directories
    if (normalized.split('/').some(part => part.startsWith('.'))) {
      return true;
    }
    
    return false;
  }

  cleanupTempFiles() {
    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1 hour
    
    for (const tempFile of this.tempFiles) {
      if (now - this.tempFile.createdAt > maxAge) {
        try {
          fs.unlink(tempFile.path);
          this.tempFiles.delete(tempFile);
        } catch (error) {
          console.warn('⚠️ Failed to clean temp file:', tempFile.path);
        }
      }
    }
  }

  async getFileTree(rootPath) {
    const tree = {
      name: path.basename(rootPath),
      path: rootPath,
      type: 'directory',
      children: []
    };
    
    try {
      const entries = await this.listDirectory(rootPath);
      
      for (const entry of entries) {
        if (this.shouldIgnore(entry.name)) continue;
        
        if (entry.type === 'directory') {
          tree.children.push({
            name: entry.name,
            path: entry.path,
            type: 'directory',
            children: await this.getFileTree(entry.path)
          });
        } else {
          tree.children.push({
            name: entry.name,
            path: entry.path,
            type: 'file',
            size: entry.size,
            modified: entry.modified
          });
        }
      }
      
    } catch (error) {
      console.error(`❌ Failed to get file tree for ${rootPath}:`, error);
    }
    
    return tree;
  }

  async exportProject(projectPath, format = 'zip') {
    // This would be implemented to export project files
    // in various formats (zip, tar.gz, etc.)
    console.log(`📦 Exporting project ${projectPath} as ${format}`);
  }
}

export { FileSystemManager };
