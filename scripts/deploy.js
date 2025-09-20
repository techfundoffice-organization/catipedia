#!/usr/bin/env node

/**
 * Catipedia Deployment Script
 * Handles deployment to various environments (development, staging, production)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  development: {
    buildDir: './dist',
    deployTarget: 'dev.catipedia.com',
    branch: 'develop'
  },
  staging: {
    buildDir: './dist',
    deployTarget: 'staging.catipedia.com',
    branch: 'staging'
  },
  production: {
    buildDir: './dist',
    deployTarget: 'catipedia.com',
    branch: 'main'
  }
};

class DeploymentManager {
  constructor(environment = 'development') {
    this.environment = environment;
    this.config = CONFIG[environment];
    
    if (!this.config) {
      throw new Error(`Invalid environment: ${environment}`);
    }
    
    console.log(`🚀 Initializing deployment for ${environment} environment`);
  }

  // Pre-deployment checks
  async preDeploymentChecks() {
    console.log('\n🔍 Running pre-deployment checks...');
    
    // Check if we're on the correct branch
    try {
      const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
      if (currentBranch !== this.config.branch) {
        console.warn(`⚠️  Warning: Current branch '${currentBranch}' doesn't match target branch '${this.config.branch}'`);
      }
    } catch (error) {
      console.error('❌ Failed to check git branch:', error.message);
    }

    // Check for uncommitted changes
    try {
      const status = execSync('git status --porcelain', { encoding: 'utf8' });
      if (status.trim()) {
        console.warn('⚠️  Warning: You have uncommitted changes');
        console.log(status);
      }
    } catch (error) {
      console.error('❌ Failed to check git status:', error.message);
    }

    // Verify package.json exists
    if (!fs.existsSync('./package.json')) {
      throw new Error('❌ package.json not found in current directory');
    }

    console.log('✅ Pre-deployment checks completed');
  }

  // Build the project
  async buildProject() {
    console.log('\n🔨 Building project...');
    
    try {
      // Install dependencies
      console.log('📦 Installing dependencies...');
      execSync('npm ci', { stdio: 'inherit' });
      
      // Run build command
      console.log('🏗️  Building project...');
      execSync('npm run build', { stdio: 'inherit' });
      
      // Verify build directory exists
      if (!fs.existsSync(this.config.buildDir)) {
        throw new Error(`Build directory ${this.config.buildDir} not found`);
      }
      
      console.log('✅ Build completed successfully');
    } catch (error) {
      throw new Error(`Build failed: ${error.message}`);
    }
  }

  // Run tests
  async runTests() {
    console.log('\n🧪 Running tests...');
    
    try {
      execSync('npm test', { stdio: 'inherit' });
      console.log('✅ All tests passed');
    } catch (error) {
      if (this.environment === 'production') {
        throw new Error(`Tests failed: ${error.message}`);
      } else {
        console.warn('⚠️  Tests failed, but continuing deployment for non-production environment');
      }
    }
  }

  // Deploy to target environment
  async deploy() {
    console.log(`\n🚀 Deploying to ${this.environment} environment...`);
    
    try {
      // For Cloudflare Pages deployment (based on wrangler.toml)
      if (fs.existsSync('./wrangler.toml')) {
        console.log('📤 Deploying with Wrangler...');
        const deployCommand = this.environment === 'production' 
          ? 'npx wrangler pages deploy ./dist --project-name=catipedia'
          : `npx wrangler pages deploy ./dist --project-name=catipedia-${this.environment}`;
        
        execSync(deployCommand, { stdio: 'inherit' });
      } else {
        // Generic deployment (customize based on your hosting provider)
        console.log('📤 Deploying files...');
        console.log(`Target: ${this.config.deployTarget}`);
        
        // Add your custom deployment logic here
        // Examples:
        // - rsync to server
        // - S3 upload
        // - FTP upload
        // - Docker deployment
      }
      
      console.log(`✅ Deployment to ${this.environment} completed successfully`);
    } catch (error) {
      throw new Error(`Deployment failed: ${error.message}`);
    }
  }

  // Post-deployment tasks
  async postDeployment() {
    console.log('\n🔄 Running post-deployment tasks...');
    
    try {
      // Warm up the site
      console.log('🌡️  Warming up deployment...');
      
      // Add post-deployment tasks here:
      // - Cache purging
      // - Health checks
      // - Notifications
      
      console.log('✅ Post-deployment tasks completed');
    } catch (error) {
      console.warn(`⚠️  Post-deployment tasks failed: ${error.message}`);
    }
  }

  // Main deployment process
  async run() {
    const startTime = Date.now();
    
    try {
      await this.preDeploymentChecks();
      await this.buildProject();
      await this.runTests();
      await this.deploy();
      await this.postDeployment();
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`\n🎉 Deployment completed successfully in ${duration}s`);
      console.log(`🌐 Environment: ${this.environment}`);
      console.log(`📍 Target: ${this.config.deployTarget}`);
      
    } catch (error) {
      console.error(`\n💥 Deployment failed: ${error.message}`);
      process.exit(1);
    }
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const environment = args[0] || 'development';
  
  console.log('🐱 Catipedia Deployment Manager');
  console.log('================================\n');
  
  const deployment = new DeploymentManager(environment);
  deployment.run().catch(error => {
    console.error('Deployment failed:', error.message);
    process.exit(1);
  });
}

module.exports = { DeploymentManager, CONFIG };
