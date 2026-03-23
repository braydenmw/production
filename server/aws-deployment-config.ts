/**
 * AWS Deployment Configuration
 * 
 * Provides deployment-specific settings for:
 * - AWS Lambda (Amplify, AppRunner, etc.)
 * - Docker on EC2 / ECS
 * - Standalone EC2/Lightsail
 * 
 * Usage:
 *   import { getDeploymentConfig } from './aws-deployment-config.js'
 *   const config = getDeploymentConfig()
 */

export type DeploymentTarget = 'lambda' | 'docker' | 'ec2' | 'local';

export interface DeploymentConfig {
  target: DeploymentTarget;
  port: number;
  baseUrl: string;
  staticDir: string;
  maxRequestSize: string;
  enableShutdownHooks: boolean;
  connectionPoolSize: number;
}

export function getDeploymentConfig(): DeploymentConfig {
  const target = detectDeploymentTarget();
  const port = parseInt(String(process.env.PORT || 3001), 10);
  const baseUrl = process.env.BASE_URL || `http://localhost:${port}`;
  
  const configs: Record<DeploymentTarget, DeploymentConfig> = {
    lambda: {
      target: 'lambda',
      port,
      baseUrl,
      staticDir: '/tmp/dist', // Lambda has /tmp for temporary files
      maxRequestSize: '1mb', // Lambda payload limits
      enableShutdownHooks: false, // Lambda manages lifecycle
      connectionPoolSize: 5, // Conservative for stateless environment
    },
    docker: {
      target: 'docker',
      port,
      baseUrl,
      staticDir: '/app/dist',
      maxRequestSize: '2mb',
      enableShutdownHooks: true,
      connectionPoolSize: 10,
    },
    ec2: {
      target: 'ec2',
      port,
      baseUrl,
      staticDir: './dist',
      maxRequestSize: '5mb',
      enableShutdownHooks: true,
      connectionPoolSize: 20,
    },
    local: {
      target: 'local',
      port,
      baseUrl,
      staticDir: './dist',
      maxRequestSize: '10mb',
      enableShutdownHooks: true,
      connectionPoolSize: 5,
    },
  };

  return configs[target];
}

export function detectDeploymentTarget(): DeploymentTarget {
  // AWS Lambda environment variables
  if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return 'lambda';
  }

  // Docker via environment variable
  if (process.env.DEPLOYMENT_TARGET === 'docker' || process.env.RUN_IN_DOCKER) {
    return 'docker';
  }

  // AWS EC2 / ECS (has AWS_REGION set automatically)
  if (process.env.ECS_CONTAINER_METADATA_URI || process.env.ECS_TASK_METADATA_URI) {
    return 'docker'; // ECS typically uses Docker
  }

  if (process.env.AWS_REGION && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return 'ec2'; // EC2 / Lightsail has AWS_REGION but not Lambda
  }

  // Local development
  return 'local';
}

/**
 * AWS Amplify specific configuration
 */
export interface AmplifyConfig {
  customDomain?: string;
  buildOutputDir: string;
  appName: string;
  environment: string;
}

export function getAmplifyConfig(): AmplifyConfig {
  return {
    customDomain: process.env.AMPLIFY_CUSTOM_DOMAIN,
    buildOutputDir: process.env.AMPLIFY_BUILD_DIR || 'dist',
    appName: process.env.AMPLIFY_APP_ID || 'bw-nexus-ai',
    environment: process.env.AMPLIFY_ENV || 'main',
  };
}

/**
 * AWS AppRunner specific configuration
 */
export interface AppRunnerConfig {
  serviceName: string;
  instanceRoleArn: string;
  port: number;
}

export function getAppRunnerConfig(): AppRunnerConfig {
  return {
    serviceName: process.env.APPRUNNER_SERVICE_NAME || 'bw-nexus-ai-service',
    instanceRoleArn: process.env.APPRUNNER_INSTANCE_ROLE_ARN || '',
    port: parseInt(String(process.env.PORT || 8080), 10),
  };
}

/**
 * AWS ECS / Fargate specific configuration
 */
export interface ECSConfig {
  taskDefinitionArn: string;
  clusterName: string;
  serviceName: string;
  containerPort: number;
  desiredCount: number;
}

export function getECSConfig(): ECSConfig {
  return {
    taskDefinitionArn: process.env.ECS_TASK_DEFINITION_ARN || '',
    clusterName: process.env.ECS_CLUSTER_NAME || 'bw-nexus-ai-cluster',
    serviceName: process.env.ECS_SERVICE_NAME || 'bw-nexus-ai-service',
    containerPort: parseInt(String(process.env.CONTAINER_PORT || 3001), 10),
    desiredCount: parseInt(String(process.env.DESIRED_COUNT || 1), 10),
  };
}

/**
 * Deployment readiness check
 */
export async function checkDeploymentReadiness(): Promise<{
  ready: boolean;
  warnings: string[];
  errors: string[];
}> {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Check AWS credentials
  if (!process.env.AWS_ACCESS_KEY_ID && !process.env.AWS_PROFILE && process.env.NODE_ENV === 'production') {
    warnings.push('AWS credentials not explicitly configured. Relying on IAM role / credential chain.');
  }

  // Check AI providers
  const hasAIProvider = Boolean(
    process.env.BEDROCK_CONSULTANT_MODEL_ID ||
    process.env.OPENAI_API_KEY ||
    process.env.GROQ_API_KEY ||
    process.env.TOGETHER_API_KEY
  );
  if (!hasAIProvider) {
    warnings.push('No AI provider configured. Add credentials to enable AI features.');
  }

  // Check database for persistence
  if (!process.env.DB_HOST && process.env.NODE_ENV === 'production') {
    warnings.push('Database not configured. Using in-memory storage (data will be lost on restart).');
  }

  // Check required environment variables
  if (!process.env.NODE_ENV) {
    errors.push('NODE_ENV not set');
  }

  return {
    ready: errors.length === 0,
    warnings,
    errors,
  };
}
