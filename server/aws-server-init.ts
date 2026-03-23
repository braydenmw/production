/**
 * AWS-Optimized Server Initialization
 * 
 * Automatically detects deployment environment (Lambda, Docker, EC2, Local)
 * and initializes the Express server accordingly.
 * 
 * This file supplements server/index.ts and can be imported by it.
 */

import { 
  detectDeploymentTarget, 
  getDeploymentConfig, 
  checkDeploymentReadiness,
  DeploymentTarget 
} from './aws-deployment-config.js';
import { IS_LAMBDA, BEDROCK_ENABLED, AWS_REGION } from './aws-config.js';

export interface ServerInitOptions {
  port?: number;
  host?: string;
  enableGracefulShutdown?: boolean;
  nodeEnv?: string;
}

/**
 * Initialize server with AWS-aware configuration
 * Call this in your server/index.ts after creating the Express app
 */
export async function initializeAWSServer(
  app: any,
  options: ServerInitOptions = {}
): Promise<{
  server?: any;
  handler?: any;
  port: number;
  target: DeploymentTarget;
}> {
  const target = detectDeploymentTarget();
  const deploymentConfig = getDeploymentConfig();
  const readiness = await checkDeploymentReadiness();

  console.log(`
╔════════════════════════════════════════════════════════════╗
║  AWS Deployment Configuration                              ║
╠════════════════════════════════════════════════════════════╣
║  Deployment Target:  ${target.toUpperCase().padEnd(43)} ║
║  Node Environment:   ${(options.nodeEnv || process.env.NODE_ENV || 'development').padEnd(40)} ║
║  AWS Region:         ${(AWS_REGION || 'not configured').padEnd(40)} ║
║  Bedrock Enabled:    ${String(BEDROCK_ENABLED).padEnd(43)} ║
║  Is Lambda:          ${String(IS_LAMBDA).padEnd(43)} ║
╚════════════════════════════════════════════════════════════╝
`);

  // Log deployment readiness
  if (!readiness.ready) {
    console.error('❌ Deployment readiness check FAILED:');
    readiness.errors.forEach(err => console.error(`   - ${err}`));
    // Don't throw - allow startup with warnings
  }

  if (readiness.warnings.length > 0) {
    console.warn('⚠️  Deployment warnings:');
    readiness.warnings.forEach(warn => console.warn(`   - ${warn}`));
  }

  // Lambda: Return handler function (Amplify/AppRunner will invoke it)
  if (target === 'lambda') {
    const { initializeLambda, lambdaHandler } = await import('./lambda-handler.js');
    await initializeLambda(app);
    
    console.log('✅ Lambda handler initialized. Server ready for invocation.');
    return {
      handler: lambdaHandler,
      port: deploymentConfig.port,
      target,
    };
  }

  // Docker / EC2 / Local: Start Express server normally
  const port = options.port || deploymentConfig.port;
  const host = options.host || '0.0.0.0';

  const server = app.listen(port, host, () => {
    console.log(`✅ Express server listening on ${host}:${port}`);
    console.log(`   Health: http://${host}:{port}/api/health`);
    console.log(`   Readiness: http://${host}:${port}/api/ai/readiness`);
  });

  // Graceful shutdown
  if (options.enableGracefulShutdown !== false) {
    setupGracefulShutdown(server);
  }

  return {
    server,
    port,
    target,
  };
}

/**
 * Setup graceful shutdown hooks
 */
function setupGracefulShutdown(server: any) {
  let isShuttingDown = false;

  const shutdown = (signal: NodeJS.Signals) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log(`\n[${signal}] Server shutting down gracefully...`);

    // Close HTTP server (stop accepting new connections)
    server.close(() => {
      console.log('✅ HTTP server closed');
      process.exit(0);
    });

    // Force exit after 30 seconds
    setTimeout(() => {
      console.error('❌ Graceful shutdown timeout, forcing exit');
      process.exit(1);
    }, 30000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Handle uncaught exceptions
  process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught exception:', err);
    shutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled rejection at:', promise, 'reason:', reason);
    shutdown('unhandledRejection');
  });
}

/**
 * Export for direct use in Lambda handlers
 */
export async function createServerHandler(app: any) {
  if (IS_LAMBDA) {
    const { initializeLambda, lambdaHandler } = await import('./lambda-handler.js');
    await initializeLambda(app);
    return lambdaHandler;
  }
  throw new Error('createServerHandler only works in Lambda environment');
}
