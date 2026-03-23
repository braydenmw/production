# AWS Deployment Guide for BW Nexus AI

## Overview

Your Express backend now supports multiple AWS deployment targets without code changes:

- **AWS Lambda + Amplify** - Serverless, auto-scaling, lowest cost
- **AWS AppRunner** - Container-based, managed deployment
- **AWS ECS/Fargate** - Containerized, full control
- **EC2/Lightsail** - Traditional VPS approach
- **Docker** - Run anywhere (local, on-prem, any cloud)

## Quick Start: AWS Amplify (Recommended)

### 1. Prepare Your Repository

```bash
# Ensure main branch has latest code
git add .
git commit -m "AWS deployment ready"
git push origin main
```

### 2. Connect to Amplify

Visit [AWS Amplify Console](https://us-east-1.console.aws.amazon.com/amplify/):

1. Click **New App** → **Host Web App**
2. Connect your GitHub repository (`braydenmw/bwmetadata`)
3. Select branch: `main`
4. Configure build settings

### 3. Amplify Build Settings

Create `amplify.yml` in your repo root:

```yaml
version: 1

frontend:
  phases:
    preBuild:
      commands:
        - npm install
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: dist
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*

backend:
  phases:
    build:
      commands:
        - echo "Building backend..."
        - npm run build:server
  artifacts:
    baseDirectory: dist-server
    files:
      - '**/*'
```

### 4. Environment Variables

In Amplify Console → **Environment Variables**, set:

```
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://your-amplify-domain.amplifyapp.com

# Choose ONE AI provider:
OPENAI_API_KEY=sk-...               # OR
GROQ_API_KEY=gsk_...                # OR
TOGETHER_API_KEY=xxxx...            # OR
BEDROCK_CONSULTANT_MODEL_ID=...     # For AWS Bedrock
AWS_REGION=us-east-1

# Optional search providers
SERPER_API_KEY=...
NEWS_API_KEY=...
ALPHA_VANTAGE_API_KEY=...
```

### 5. Deploy

Push to GitHub and Amplify will auto-deploy. Watch the build logs in the console.

---

## AWS AppRunner Deployment

### 1. Create Docker Image

Ensure `Dockerfile` exists (should already be in repo):

```bash
docker build -t bw-nexus-ai:latest .
docker tag bw-nexus-ai:latest ACCOUNT_ID.dkr.ecr.REGION.amazonaws.com/bw-nexus-ai:latest
```

### 2. Push to ECR

```bash
aws ecr create-repository --repository-name bw-nexus-ai --region us-east-1

aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ACCOUNT_ID.dkr.ecr.REGION.amazonaws.com

docker push ACCOUNT_ID.dkr.ecr.REGION.amazonaws.com/bw-nexus-ai:latest
```

### 3. Create AppRunner Service

In AWS Console → AppRunner:

1. Create new service
2. Source: ECR (select pushed image)
3. Port: 3001
4. Environment variables: (same as Amplify above)
5. Deploy

---

## AWS ECS/Fargate Deployment

### 1. Create Task Definition

```bash
aws ecs register-task-definition \
  --family bw-nexus-ai \
  --network-mode awsvpc \
  --requires-compatibilities FARGATE \
  --cpu 1024 \
  --memory 2048 \
  --container-definitions '[
    {
      "name": "bw-nexus-ai",
      "image": "ACCOUNT_ID.dkr.ecr.REGION.amazonaws.com/bw-nexus-ai:latest",
      "essential": true,
      "portMappings": [
        {
          "containerPort": 3001,
          "hostPort": 3001,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {"name": "NODE_ENV", "value": "production"},
        {"name": "PORT", "value": "3001"}
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/bw-nexus-ai",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]'
```

### 2. Create Service

```bash
aws ecs create-service \
  --cluster bw-nexus-ai-cluster \
  --service-name bw-nexus-ai-service \
  --task-definition bw-nexus-ai:1 \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}" \
  --load-balancers targetGroupArn=arn:aws:elasticloadbalancing:...,containerName=bw-nexus-ai,containerPort=3001
```

---

## EC2/Lightsail Deployment

### 1. SSH into Server

```bash
ssh -i your-key.pem ec2-user@your-instance-ip
```

### 2. Install Dependencies

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs npm git
```

### 3. Clone and Build

```bash
git clone https://github.com/braydenmw/bwmetadata.git
cd bwmetadata
npm install
npm run build:all
```

### 4. Start Server

```bash
# Using PM2 for process management
npm install -g pm2
pm2 start "npm start" --name "bw-nexus-ai"
pm2 startup
pm2 save
```

### 5. Configure Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Docker Deployment (Any Environment)

### 1. Build

```bash
docker build -t bw-nexus-ai:latest .
```

### 2. Run

```bash
docker run -d \
  -p 3001:3001 \
  -e NODE_ENV=production \
  -e OPENAI_API_KEY=$OPENAI_API_KEY \
  -e PORT=3001 \
  bw-nexus-ai:latest
```

### 3. With Docker Compose

```yaml
version: '3.8'
services:
  api:
    build: .
    ports:
      - '3001:3001'
    environment:
      NODE_ENV: production
      PORT: 3001
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      GROQ_API_KEY: ${GROQ_API_KEY}
    restart: unless-stopped
```

Run: `docker-compose up -d`

---

## Health Checks

After deployment, verify your backend is working:

```bash
# Health check
curl https://your-domain/api/health

# AI readiness check
curl https://your-domain/api/ai/readiness

# Test AI endpoint (if configured)
curl -X POST https://your-domain/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello"}]}'
```

---

## Environment Variables Reference

| Variable | Required | Example | Purpose |
|----------|----------|---------|---------|
| `NODE_ENV` | Yes | `production` | Enables production optimizations |
| `PORT` | No | `3001` | Express server port |
| `FRONTEND_URL` | No | `https://example.com` | CORS origin |
| `OPENAI_API_KEY` | No* | `sk-...` | OpenAI GPT-4 access |
| `GROQ_API_KEY` | No* | `gsk_...` | Groq LLaMA access |
| `TOGETHER_API_KEY` | No* | `xxxx` | Together.ai access |
| `AWS_REGION` | No | `us-east-1` | AWS region for Bedrock |
| `DB_HOST` | No | `db.example.com` | PostgreSQL host |
| `DB_USER` | No | `postgres` | Database user |
| `DB_PASSWORD` | No | `xxxxx` | Database password |

*At least one AI provider should be configured for features to work.

---

## Troubleshooting

### "AI provider not configured" on Amplify

**Solution**: Set environment variables in Amplify Console and redeploy.

### Cold start delays (Lambda)

**Solution**: Add CloudWatch scheduled events to warm up Lambda periodically:

```bash
aws events put-rule --name bw-nexus-warmup --schedule-expression "rate(5 minutes)"
aws events put-targets --rule bw-nexus-warmup --targets "Id"="1","Arn"="arn:aws:lambda:..."
```

### Port already in use (Docker)

**Solution**: Map to different host port:

```bash
docker run -p 8080:3001 bw-nexus-ai:latest
```

### Memory exceeded on Lambda

**Solution**: Increase Lambda memory in AWS Console or serverless.yml (comes with more CPU automatically).

---

## Next Steps

1. **Choose a deployment**: Start with Amplify (easiest)
2. **Set environment variables**: Add API keys to enable AI features
3. **Test health endpoints**: Verify backend is responding
4. **Monitor**: Set up CloudWatch logs and alarms
5. **Scale**: Configure auto-scaling for production load

Need help? Check AWS documentation:
- [AWS Amplify Docs](https://docs.aws.amazon.com/amplify/)
- [AWS AppRunner Docs](https://docs.aws.amazon.com/apprunner/)
- [AWS ECS Docs](https://docs.aws.amazon.com/ecs/)
