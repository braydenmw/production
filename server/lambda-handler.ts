/**
 * AWS Lambda Handler Wrapper
 * Enables Express app to run on AWS Lambda, Amplify, or AppRunner
 * 
 * This wrapper handles:
 * - Lambda event conversion to Express request
 * - Response formatting for API Gateway / AppRunner
 * - Connection pooling and cleanup on Lambda cold starts
 */

import serverless from 'serverless-http';
import { IS_LAMBDA, resetBedrockClient } from './aws-config.js';

// Import the Express app from the main server file
// This will be bundled together during build
let app: any;
let handler: any;

export const initializeLambda = async (expressApp: any) => {
  app = expressApp;
  
  // Wrap Express app for Lambda
  handler = serverless(app, {
    binary: [
      'application/octet-stream',
      'font/eot',
      'font/opentype',
      'font/otf',
      'image/jpeg',
      'image/png',
      'image/svg+xml',
    ],
  });

  console.log('[Lambda] Handler initialized for AWS Lambda');
  return handler;
};

/**
 * Primary Lambda handler - processes AWS Lambda events
 * Compatible with: API Gateway v1/v2, Application Load Balancer, Amplify
 */
export const lambdaHandler = async (event: any, context: any) => {
  console.log('[Lambda] Event received:', {
    method: event.httpMethod || event.requestContext?.http?.method,
    path: event.path || event.rawPath,
    source: event.requestContext?.eventSource || 'unknown',
  });

  // Ensure handler is initialized
  if (!handler) {
    throw new Error('Lambda handler not initialized. Call initializeLambda() first.');
  }

  try {
    // Set Lambda-specific context timeout
    // This allows the handler to gracefully finish before Lambda cuts off
    const timeoutHandler = setTimeout(() => {
      console.warn('[Lambda] Request approaching timeout, should complete soon');
    }, context.getRemainingTimeInMillis ? context.getRemainingTimeInMillis() - 5000 : 55000);

    // Process the request through Express
    const response = await handler(event, context);

    clearTimeout(timeoutHandler);

    // Log response
    console.log('[Lambda] Response:', {
      statusCode: response.statusCode,
      size: response.body?.length || 0,
    });

    return response;
  } catch (error) {
    console.error('[Lambda] Handler error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      }),
    };
  } finally {
    // Clean up AWS clients after function execution
    // Lambda may reuse this container for future invocations
    if (IS_LAMBDA) {
      resetBedrockClient();
    }
  }
};

/**
 * Warmup handler - responds to CloudWatch scheduled events
 * Keeps Lambda container warm to avoid cold starts
 */
export const warmupHandler = async (event: any, _context: any) => {
  console.log('[Lambda] Warmup event received');
  
  if (event.source === 'aws.events' || event['detail-type'] === 'Scheduled Event') {
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Container warmed' }),
    };
  }

  // Not a warmup event, pass to main handler
  return lambdaHandler(event, _context);
};

export default lambdaHandler;
