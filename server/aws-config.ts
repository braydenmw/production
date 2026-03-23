/**
 * AWS Configuration Module
 * Handles AWS-specific configuration for Bedrock, RDS, and other services
 */

import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';

// AWS Region - for AWS deployments
export const AWS_REGION = process.env.AWS_REGION || 'us-east-1';

// AWS Bedrock Configuration
export const BEDROCK_MODEL_ID = process.env.BEDROCK_CONSULTANT_MODEL_ID || 'anthropic.claude-3-sonnet-20240229-v1:0';
export const BEDROCK_ENABLED = Boolean(
  process.env.AWS_REGION || 
  process.env.AWS_ACCESS_KEY_ID || 
  process.env.AWS_SECRET_ACCESS_KEY ||
  process.env.AWS_PROFILE
);

/**
 * Lazy-initialize Bedrock client only when AWS credentials are available
 * This prevents errors when running locally without AWS credentials
 */
let bedrockClient: BedrockRuntimeClient | null = null;

export function getBedrockClient(): BedrockRuntimeClient {
  if (!bedrockClient) {
    const clientConfig: any = { region: AWS_REGION };
    
    // Use explicit credentials if provided (AWS Lambda, ECS, production)
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      clientConfig.credentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      };
    }
    // Otherwise rely on credential chain (IAM roles, ~/.aws/credentials, etc.)
    
    bedrockClient = new BedrockRuntimeClient(clientConfig);
  }
  return bedrockClient;
}

export function resetBedrockClient() {
  if (bedrockClient) {
    bedrockClient.destroy();
    bedrockClient = null;
  }
}

/**
 * AWS RDS Configuration for PostgreSQL
 */
export const DB_HOST = process.env.DB_HOST || 'localhost';
export const DB_PORT = parseInt(String(process.env.DB_PORT || 5432), 10);
export const DB_USER = process.env.DB_USER || 'postgres';
export const DB_PASSWORD = process.env.DB_PASSWORD || '';
export const DB_NAME = process.env.DB_NAME || 'bwnexus';

/**
 * AWS S3 Configuration for report storage
 */
export const S3_BUCKET = process.env.S3_BUCKET || '';
export const S3_ENABLED = Boolean(S3_BUCKET);

/**
 * AWS CloudWatch Logging Configuration
 */
export const CLOUDWATCH_ENABLED = process.env.ENABLE_CLOUDWATCH_LOGS === 'true';
export const LOG_GROUP = process.env.LOG_GROUP_NAME || '/aws/lambda/bw-nexus-ai';
export const LOG_STREAM = process.env.LOG_STREAM_NAME || `stream-${new Date().toISOString().split('T')[0]}`;

/**
 * Health check configuration
 */
export const HEALTH_CHECK_INTERVAL_MS = parseInt(String(process.env.HEALTH_CHECK_INTERVAL_MS || 30000), 10);

/**
 * Lambda configuration (if running on AWS Lambda)
 */
export const IS_LAMBDA = Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);
export const LAMBDA_TIMEOUT_MS = parseInt(String(process.env.AWS_LAMBDA_TIMEOUT_MS || 900000), 10); // 15 mins default
