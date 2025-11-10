// =============================================================================
// SILHOUETTE V5.0 - GITHUB INTEGRATION SYSTEM
// Integración completa con GitHub para desarrollo colaborativo
// =============================================================================

import { EventEmitter } from 'events';
import { Octokit } from '@octokit/rest';
import * as simpleGit from 'simple-git';
import * as fs from 'fs/promises';
import * as path from 'path';

class GitHubIntegration extends EventEmitter {
  constructor() {
    super();
    this.tokens = new Map(); // tokenId -> token info
    this.repositories = new Map(); // repoId -> repository info
    this.syncStatus = new Map(); // projectId -> sync status
    this.webhooks = new Map(); // webhookId -> webhook info
    this.currentUser = null;
    this.isInitialized = false;
    
    // Configuration
    this.config = {
      defaultBranches: ['main', 'master'],
      supportedLanguages: ['javascript', 'typescript', 'python', 'java', 'c++', 'go', 'rust'],
      maxFileSize: 100 * 1024 * 1024, // 100MB
      supportedFileTypes: [
        '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c', '.h', '.cs', '.go', '.rs', '.php', '.rb', '.swift', '.kt',
        '.html', '.css', '.scss', '.sass', '.less', '.json', '.xml', '.yaml', '.yml', '.md', '.txt', '.csv', '.sql'
      ],
      ignoredFiles: [
        'node_modules/**',
        'dist/**',
        'build/**',
        '.git/**',
        '.DS_Store',
        '*.log',
        '.env',
        '.env.local',
        'coverage/**',
        '.nyc_output/**'
      ]
    };
  }

  // =============================================================================
  // INICIALIZACIÓN
  // =============================================================================
  
  async initialize() {
    console.log('🐙 Initializing GitHub Integration...');
    
    try {
      // Load stored tokens
      await this.loadStoredTokens();
      
      // Setup webhook handlers
      await this.setupWebhookHandlers();
      
      // Initialize Git operations
      await this.initializeGitOperations();
      
      this.isInitialized = true;
      console.log('✅ GitHub Integration initialized');
      
      this.emit('initialized');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to initialize GitHub Integration:', error);
      return false;
    }
  }

  async loadStoredTokens() {
    try {
      // This would load tokens from secure storage
      // For now, just log that we're ready
      console.log('✅ Token storage ready');
    } catch (error) {
      console.warn('⚠️ Could not load stored tokens:', error.message);
    }
  }

  async setupWebhookHandlers() {
    // Setup webhook endpoints
    this.webhookHandlers = {
      'push': this.handlePushWebhook.bind(this),
      'pull_request': this.handlePullRequestWebhook.bind(this),
      'issue': this.handleIssueWebhook.bind(this),
      'release': this.handleReleaseWebhook.bind(this)
    };
    
    console.log('✅ Webhook handlers configured');
  }

  async initializeGitOperations() {
    // This would initialize git operations
    console.log('✅ Git operations initialized');
  }

  // =============================================================================
  // AUTENTICACIÓN Y TOKENS
  // =============================================================================
  
  async connectWithToken(token, options = {}) {
    console.log('🔐 Connecting to GitHub with token...');
    
    try {
      // Validate token
      const client = new Octokit({
        auth: token,
        userAgent: 'Silhouette-V5.0/1.0.0'
      });
      
      // Test token by getting user info
      const { data: user } = await client.rest.users.getAuthenticated();
      
      // Check token scopes
      const { data: scopes } = await client.rest.oauth.getAuthorizedToken();
      
      const tokenInfo = {
        id: this.generateTokenId(),
        token: token,
        user: user,
        scopes: scopes.scopes,
        createdAt: Date.now(),
        lastUsed: Date.now(),
        isActive: true,
        client: client
      };
      
      this.tokens.set(tokenInfo.id, tokenInfo);
      this.currentUser = user;
      
      this.emit('tokenConnected', { tokenInfo });
      
      console.log(`✅ GitHub connected as: ${user.login}`);
      return {
        success: true,
        user: user,
        scopes: scopes.scopes,
        tokenId: tokenInfo.id
      };
      
    } catch (error) {
      console.error('❌ GitHub token validation failed:', error);
      
      this.emit('tokenError', { error: error.message });
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  async disconnectToken(tokenId) {
    const tokenInfo = this.tokens.get(tokenId);
    if (!tokenInfo) {
      return false;
    }
    
    try {
      // Revoke token on GitHub
      await tokenInfo.client.rest.oauth.deleteAuthorizedToken({
        token: tokenInfo.token
      });
      
      // Remove from local storage
      this.tokens.delete(tokenId);
      
      if (this.currentUser && this.currentUser.id === tokenInfo.user.id) {
        this.currentUser = null;
      }
      
      this.emit('tokenDisconnected', { tokenInfo });
      
      console.log('✅ GitHub token disconnected');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to disconnect GitHub token:', error);
      return false;
    }
  }

  async getStoredTokens() {
    return Array.from(this.tokens.values()).map(token => ({
      id: token.id,
      user: token.user,
      scopes: token.scopes,
      createdAt: token.createdAt,
      lastUsed: token.lastUsed,
      isActive: token.isActive
    }));
  }

  // =============================================================================
  // GESTIÓN DE REPOSITORIOS
  // =============================================================================
  
  async listRepositories(options = {}) {
    const activeToken = this.getActiveToken();
    if (!activeToken) {
      throw new Error('No active GitHub token');
    }
    
    try {
      const params = {
        visibility: options.visibility || 'all',
        affiliation: options.affiliation || 'owner,collaborator,organization_member',
        sort: options.sort || 'updated',
        per_page: options.perPage || 100,
        page: options.page || 1
      };
      
      const { data: repos } = await activeToken.client.rest.repos.listForAuthenticatedUser(params);
      
      return repos.map(repo => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        url: repo.html_url,
        cloneUrl: repo.clone_url,
        sshUrl: repo.ssh_url,
        private: repo.private,
        fork: repo.fork,
        owner: {
          login: repo.owner.login,
          avatar: repo.owner.avatar_url,
          url: repo.owner.html_url
        },
        defaultBranch: repo.default_branch,
        language: repo.language,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        size: repo.size,
        createdAt: repo.created_at,
        updatedAt: repo.updated_at,
        pushedAt: repo.pushed_at
      }));
      
    } catch (error) {
      console.error('❌ Failed to list repositories:', error);
      throw error;
    }
  }

  async createRepository(options) {
    const activeToken = this.getActiveToken();
    if (!activeToken) {
      throw new Error('No active GitHub token');
    }
    
    try {
      const repoData = {
        name: options.name,
        description: options.description || '',
        private: options.private || false,
        has_issues: options.hasIssues !== false,
        has_projects: options.hasProjects !== false,
        has_wiki: options.hasWiki !== false,
        has_pages: options.hasPages || false,
        is_template: options.isTemplate || false,
        auto_init: options.autoInit !== false,
        gitignore_template: options.gitignoreTemplate || 'Node',
        license_template: options.licenseTemplate || null,
        default_branch: options.defaultBranch || 'main'
      };
      
      const { data: repo } = await activeToken.client.rest.repos.createForAuthenticatedUser(repoData);
      
      const repositoryInfo = {
        id: repo.id,
        repo: repo,
        localPath: path.join(this.getRepositoriesPath(), repo.name),
        syncStatus: 'created',
        lastSync: Date.now()
      };
      
      this.repositories.set(repo.id, repositoryInfo);
      
      this.emit('repositoryCreated', { repositoryInfo });
      
      console.log(`✅ Repository created: ${repo.full_name}`);
      return repositoryInfo;
      
    } catch (error) {
      console.error('❌ Failed to create repository:', error);
      throw error;
    }
  }

  async cloneRepository(repoUrl, localPath) {
    const activeToken = this.getActiveToken();
    if (!activeToken) {
      throw new Error('No active GitHub token');
    }
    
    try {
      const git = simpleGit({
        baseDir: path.dirname(localPath)
      });
      
      // Clone with authentication
      await git.clone(repoUrl, path.basename(localPath), {
        '--depth': 1,
        '--branch': 'main'
      });
      
      // Configure git with user info
      const { user } = activeToken;
      await git.init();
      await git.addConfig('user.name', user.name || user.login);
      await git.addConfig('user.email', user.email || `${user.login}@users.noreply.github.com`);
      
      this.emit('repositoryCloned', { localPath, repoUrl });
      
      console.log(`✅ Repository cloned: ${localPath}`);
      return true;
      
    } catch (error) {
      console.error('❌ Failed to clone repository:', error);
      throw error;
    }
  }

  // =============================================================================
  // SINCRONIZACIÓN DE PROYECTOS
  // =============================================================================
  
  async syncProject(project, options = {}) {
    const repositoryInfo = this.getRepositoryForProject(project.id);
    if (!repositoryInfo) {
      throw new Error(`No repository found for project: ${project.id}`);
    }
    
    try {
      const git = simpleGit(repositoryInfo.localPath);
      const syncStatus = {
        projectId: project.id,
        repositoryId: repositoryInfo.id,
        status: 'syncing',
        startedAt: Date.now(),
        lastCommit: null,
        lastPush: null
      };
      
      // Add all files
      await git.add('.');
      
      // Check if there are changes
      const status = await git.status();
      if (status.files.length === 0) {
        syncStatus.status = 'clean';
        syncStatus.completedAt = Date.now();
        this.syncStatus.set(project.id, syncStatus);
        return syncStatus;
      }
      
      // Generate commit message if not provided
      const commitMessage = options.commitMessage || this.generateCommitMessage(project, status);
      
      // Commit changes
      const commit = await git.commit(commitMessage);
      syncStatus.lastCommit = {
        hash: commit.commit,
        message: commit.summary.changes > 0 ? commitMessage : 'No changes to commit',
        files: status.files.length
      };
      
      // Push to GitHub if requested
      if (options.push) {
        try {
          await git.push('origin', 'main');
          syncStatus.lastPush = {
            timestamp: Date.now(),
            success: true
          };
        } catch (pushError) {
          syncStatus.lastPush = {
            timestamp: Date.now(),
            success: false,
            error: pushError.message
          };
        }
      }
      
      syncStatus.status = 'completed';
      syncStatus.completedAt = Date.now();
      
      this.syncStatus.set(project.id, syncStatus);
      
      this.emit('projectSynced', { project, syncStatus });
      
      console.log(`✅ Project synced: ${project.name}`);
      return syncStatus;
      
    } catch (error) {
      console.error(`❌ Failed to sync project:`, project.name, error);
      
      const syncStatus = {
        projectId: project.id,
        status: 'error',
        error: error.message,
        completedAt: Date.now()
      };
      
      this.syncStatus.set(project.id, syncStatus);
      this.emit('projectSyncError', { project, error });
      
      throw error;
    }
  }

  async pullProject(project) {
    const repositoryInfo = this.getRepositoryForProject(project.id);
    if (!repositoryInfo) {
      throw new Error(`No repository found for project: ${project.id}`);
    }
    
    try {
      const git = simpleGit(repositoryInfo.localPath);
      
      // Pull latest changes
      const pull = await git.pull('origin', 'main');
      
      const pullStatus = {
        projectId: project.id,
        status: 'success',
        filesChanged: pull.files ? pull.files.length : 0,
        insertions: pull.insertions || 0,
        deletions: pull.deletions || 0,
        timestamp: Date.now()
      };
      
      this.emit('projectPulled', { project, pullStatus });
      
      console.log(`✅ Project pulled: ${project.name}`);
      return pullStatus;
      
    } catch (error) {
      console.error(`❌ Failed to pull project:`, project.name, error);
      throw error;
    }
  }

  async getSyncStatus(projectId) {
    return this.syncStatus.get(projectId) || {
      projectId,
      status: 'not_synced',
      lastSync: null
    };
  }

  // =============================================================================
  // GESTIÓN DE BRANCHES
  // =============================================================================
  
  async createBranch(project, branchName, fromBranch = 'main') {
    const repositoryInfo = this.getRepositoryForProject(project.id);
    if (!repositoryInfo) {
      throw new Error(`No repository found for project: ${project.id}`);
    }
    
    try {
      const git = simpleGit(repositoryInfo.localPath);
      
      // Create and switch to new branch
      await git.checkoutBranch(branchName, fromBranch);
      
      // Push new branch to GitHub
      await git.push('origin', branchName);
      
      this.emit('branchCreated', { project, branchName, fromBranch });
      
      console.log(`✅ Branch created: ${branchName}`);
      return true;
      
    } catch (error) {
      console.error(`❌ Failed to create branch:`, branchName, error);
      throw error;
    }
  }

  async listBranches(project) {
    const repositoryInfo = this.getRepositoryForProject(project.id);
    if (!repositoryInfo) {
      throw new Error(`No repository found for project: ${project.id}`);
    }
    
    try {
      const git = simpleGit(repositoryInfo.localPath);
      const branches = await git.branch();
      
      return {
        all: branches.all,
        current: branches.current,
        remotes: branches.remotes
      };
      
    } catch (error) {
      console.error(`❌ Failed to list branches for project:`, project.name, error);
      throw error;
    }
  }

  async switchBranch(project, branchName) {
    const repositoryInfo = this.getRepositoryForProject(project.id);
    if (!repositoryInfo) {
      throw new Error(`No repository found for project: ${project.id}`);
    }
    
    try {
      const git = simpleGit(repositoryInfo.localPath);
      
      // Switch to branch
      await git.checkout(branchName);
      
      // Pull latest changes if branch exists on remote
      try {
        await git.pull('origin', branchName);
      } catch (pullError) {
        // Branch might not exist on remote, ignore
      }
      
      this.emit('branchSwitched', { project, branchName });
      
      console.log(`✅ Switched to branch: ${branchName}`);
      return true;
      
    } catch (error) {
      console.error(`❌ Failed to switch to branch:`, branchName, error);
      throw error;
    }
  }

  // =============================================================================
  // PULL REQUESTS
  // =============================================================================
  
  async createPullRequest(project, options) {
    const activeToken = this.getActiveToken();
    if (!activeToken) {
      throw new Error('No active GitHub token');
    }
    
    const repositoryInfo = this.getRepositoryForProject(project.id);
    if (!repositoryInfo) {
      throw new Error(`No repository found for project: ${project.id}`);
    }
    
    try {
      const [owner, repo] = repositoryInfo.repo.full_name.split('/');
      
      const prData = {
        title: options.title,
        body: options.body || '',
        head: options.head, // branch to merge from
        base: options.base || 'main', // branch to merge to
        draft: options.draft || false
      };
      
      const { data: pr } = await activeToken.client.rest.pulls.create({
        owner,
        repo,
        ...prData
      });
      
      this.emit('pullRequestCreated', { project, pullRequest: pr });
      
      console.log(`✅ Pull request created: ${pr.html_url}`);
      return pr;
      
    } catch (error) {
      console.error(`❌ Failed to create pull request:`, error);
      throw error;
    }
  }

  async listPullRequests(project, state = 'open') {
    const activeToken = this.getActiveToken();
    if (!activeToken) {
      throw new Error('No active GitHub token');
    }
    
    const repositoryInfo = this.getRepositoryForProject(project.id);
    if (!repositoryInfo) {
      throw new Error(`No repository found for project: ${project.id}`);
    }
    
    try {
      const [owner, repo] = repositoryInfo.repo.full_name.split('/');
      
      const { data: prs } = await activeToken.client.rest.pulls.list({
        owner,
        repo,
        state,
        per_page: 100
      });
      
      return prs.map(pr => ({
        id: pr.id,
        number: pr.number,
        title: pr.title,
        body: pr.body,
        state: pr.state,
        url: pr.html_url,
        user: pr.user,
        head: pr.head,
        base: pr.base,
        createdAt: pr.created_at,
        updatedAt: pr.updated_at,
        mergedAt: pr.merged_at,
        closedAt: pr.closed_at
      }));
      
    } catch (error) {
      console.error(`❌ Failed to list pull requests:`, error);
      throw error;
    }
  }

  // =============================================================================
  // WEBHOOKS
  // =============================================================================
  
  async setupWebhook(repositoryId, events = ['push', 'pull_request']) {
    const activeToken = this.getActiveToken();
    if (!activeToken) {
      throw new Error('No active GitHub token');
    }
    
    const repositoryInfo = this.repositories.get(repositoryId);
    if (!repositoryInfo) {
      throw new Error(`Repository not found: ${repositoryId}`);
    }
    
    try {
      const [owner, repo] = repositoryInfo.repo.full_name.split('/');
      
      const webhookData = {
        name: 'Silhouette V5.0',
        active: true,
        events: events,
        config: {
          url: `https://your-webhook-endpoint.com/webhook/${repositoryId}`,
          content_type: 'json',
          insecure_ssl: '0',
          secret: this.generateWebhookSecret()
        }
      };
      
      const { data: webhook } = await activeToken.client.rest.repos.createWebhook({
        owner,
        repo,
        ...webhookData
      });
      
      this.webhooks.set(webhook.id, webhook);
      
      this.emit('webhookCreated', { repositoryId, webhook });
      
      console.log(`✅ Webhook created for repository: ${repositoryInfo.repo.full_name}`);
      return webhook;
      
    } catch (error) {
      console.error(`❌ Failed to create webhook:`, error);
      throw error;
    }
  }

  // =============================================================================
  // WEBHOOK HANDLERS
  // =============================================================================
  
  async handlePushWebhook(payload) {
    console.log(`📦 Push received: ${payload.repository.full_name} - ${payload.ref}`);
    
    const repositoryInfo = this.getRepositoryByFullName(payload.repository.full_name);
    if (repositoryInfo) {
      this.emit('pushReceived', { 
        repositoryInfo, 
        payload,
        branch: payload.ref.replace('refs/heads/', ''),
        commits: payload.commits
      });
    }
  }

  async handlePullRequestWebhook(payload) {
    console.log(`🔀 PR event: ${payload.action} - ${payload.pull_request.title}`);
    
    this.emit('pullRequestEvent', { payload });
  }

  async handleIssueWebhook(payload) {
    console.log(`📋 Issue event: ${payload.action} - ${payload.issue.title}`);
    
    this.emit('issueEvent', { payload });
  }

  async handleReleaseWebhook(payload) {
    console.log(`🚀 Release: ${payload.release.tag_name} - ${payload.release.name}`);
    
    this.emit('releaseEvent', { payload });
  }

  // =============================================================================
  // UTILIDADES
  // =============================================================================
  
  getActiveToken() {
    if (this.currentUser) {
      for (const token of this.tokens.values()) {
        if (token.user.id === this.currentUser.id && token.isActive) {
          return token;
        }
      }
    }
    return null;
  }

  getRepositoryForProject(projectId) {
    for (const [id, repo] of this.repositories) {
      if (repo.projectId === projectId) {
        return repo;
      }
    }
    return null;
  }

  getRepositoryByFullName(fullName) {
    for (const [id, repo] of this.repositories) {
      if (repo.repo.full_name === fullName) {
        return repo;
      }
    }
    return null;
  }

  getRepositoriesPath() {
    return path.join(process.env.HOME || process.env.USERPROFILE || '/tmp', 'Silhouette-V5-Repositories');
  }

  generateCommitMessage(project, gitStatus) {
    const timestamp = new Date().toISOString().split('T')[0];
    const fileCount = gitStatus.files.length;
    
    // Get file types
    const fileTypes = this.getFileTypesFromStatus(gitStatus.files);
    
    let message = `Silhouette V5.0: ${project.name} - ${timestamp}`;
    
    if (fileTypes.length > 0) {
      message += `\n\nChanges: ${fileTypes.join(', ')}`;
    }
    
    if (fileCount > 5) {
      message += `\n\n${fileCount} files modified`;
    }
    
    return message;
  }

  getFileTypesFromStatus(files) {
    const types = new Set();
    
    for (const file of files) {
      const ext = path.extname(file.path).toLowerCase();
      if (this.config.supportedLanguages.includes(ext.substring(1))) {
        types.add(ext.substring(1));
      }
    }
    
    return Array.from(types);
  }

  generateTokenId() {
    return `token-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  generateWebhookSecret() {
    return `silhouette-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // =============================================================================
  // CLEANUP
  // =============================================================================
  
  async dispose() {
    // Clean up connections
    this.tokens.clear();
    this.repositories.clear();
    this.syncStatus.clear();
    this.webhooks.clear();
    this.currentUser = null;
    
    console.log('🗑️ GitHub Integration disposed');
  }
}

export { GitHubIntegration };
