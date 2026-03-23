# AWS Deployment Checklist

## Pre-Deployment ✅

- [ ] Code is committed and pushed to `main` branch
- [ ] `.env` file is NOT committed (check `.gitignore`)
- [ ] `npm run build` completes without errors
- [ ] `npm run build:server` completes without errors
- [ ] Backend starts locally: `npm start`
- [ ] Frontend loads at `http://localhost:3001`
- [ ] All API endpoints respond: `curl http://localhost:3001/api/health`

## AWS Account Setup ✅

- [ ] AWS Account created (https://console.aws.amazon.com/)
- [ ] GitHub personal access token created (for Amplify connection)
- [ ] IAM user with AdministratorAccess (for deployment)
- [ ] AWS CLI configured: `aws configure`

## Amplify Deployment ✅ (RECOMMENDED)

### Connect Repository
- [ ] Log in to [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
- [ ] Click **New App** → **Host Web App**
- [ ] Select GitHub
- [ ] Authorize GitHub and select repository: `braydenmw/bwmetadata`
- [ ] Select branch: `main`
- [ ] Accept defaults (or customize app name)

### Configure Build Settings
- [ ] Review build settings (automated from `amplify.yml`)
- [ ] Confirm frontend artifact directory: `dist`
- [ ] Confirm backend artifact directory: `dist-server`

### Set Environment Variables
In Amplify Console → **Environment Variables**, add:

```
NODE_ENV=production
PORT=3001
FRONTEND_URL=<your-amplify-app-domain>

# Choose ONE AI Provider:
# Option 1: OpenAI
OPENAI_API_KEY=sk-<your-key>

# Option 2: Groq
GROQ_API_KEY=gsk_<your-key>

# Option 3: Together.ai
TOGETHER_API_KEY=<your-key>

# Option 4: AWS Bedrock (requires AWS credentials)
AWS_REGION=us-east-1
BEDROCK_CONSULTANT_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0

# Optional: Additional API keys
SERPER_API_KEY=<your-key>
NEWS_API_KEY=<your-key>
ALPHA_VANTAGE_API_KEY=<your-key>
```

### Deploy
- [ ] Click **Deploy** button (or push to `main` for auto-deploy)
- [ ] Monitor logs in Amplify Console
- [ ] Wait for deployment to complete (~3-5 minutes)
- [ ] Amplify provides live URL when done

## Post-Deployment Testing ✅

### Health Checks
```bash
# Replace with your Amplify domain
APP_URL="https://your-app-name.amplifyapp.com"

# Test backend health
curl $APP_URL/api/health

# Test AI readiness
curl $APP_URL/api/ai/readiness

# Test a simple AI call (if OpenAI/Groq configured)
curl -X POST $APP_URL/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello"}]}'
```

### Console Logs
- [ ] Check Amplify Console backend logs for errors
- [ ] Verify `NODE_ENV=production` is set
- [ ] Verify API keys are loaded (not showing "No provider configured")

## Alternative Deployments

### Docker + Render (Alternative to Amplify)
- [ ] Create account at https://render.com/
- [ ] Push Docker image or connect GitHub repo
- [ ] Set same environment variables
- [ ] Deploy

### Docker + Railway (Alternative to Amplify)
- [ ] Create account at https://railway.app/
- [ ] Connect GitHub repo
- [ ] Set environment variables
- [ ] Deploy

### Manual EC2 Deployment
- [ ] Launch t3.micro EC2 instance (free tier)
- [ ] SSH into instance
- [ ] Install Node.js 20+
- [ ] Clone repo: `git clone <repo>`
- [ ] Build: `npm run build:all`
- [ ] Start: `npm start`
- [ ] Assign Elastic IP and domain
- [ ] Set up nginx reverse proxy to localhost:3001

## Production Hardening ✅

After deployment, improve security:

- [ ] Enable HTTPS/SSL (Amplify does this automatically)
- [ ] Set up CloudWatch monitoring and alarms
- [ ] Add RDS PostgreSQL for persistence (optional)
- [ ] Configure S3 for report storage (optional)
- [ ] Enable AWS WAF for DDoS protection
- [ ] Set up CloudFront CDN for static assets
- [ ] Regular backups configured
- [ ] VPC security groups properly configured

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "No AI provider configured" | Check env vars in Amplify console, redeploy |
| Build fails (timeout) | Increase Amplify build timeout in settings |
| Cold start delays (Lambda) | Add CloudWatch warmer to invoke Lambda every 5min |
| Memory limit exceeded | Upgrade Lambda memory (Amplify console) |
| CORS errors | Check `FRONTEND_URL` env var matches actual domain |

## Monitoring & Maintenance

- [ ] Set up CloudWatch alarms for errors
- [ ] Monitor monthly costs in AWS Billing
- [ ] Update dependencies monthly: `npm update`
- [ ] Review security patches: `npm audit`
- [ ] Rotate API keys quarterly
- [ ] Check logs weekly for issues

## Success! 🎉

Your app is now live on AWS! 

- **Amplify Dashboard**: https://console.aws.amazon.com/amplify/
- **App URL**: `https://your-app-name.amplifyapp.com`
- **API Endpoint**: `https://your-app-name.amplifyapp.com/api`
- **Health Check**: `https://your-app-name.amplifyapp.com/api/health`

### Next Steps
1. Invite team members to Amplify console
2. Configure custom domain (optional, ~$12/year)
3. Set up email notifications for errors
4. Document API endpoints for team
5. Start gathering user feedback

---

**Need Help?**
- [AWS Amplify Docs](https://docs.aws.amazon.com/amplify/)
- [Express.js Deployment](https://expressjs.com/en/advanced/best-practice-performance.html)
- [Node.js in AWS](https://nodejs.org/en/docs/guides/nodejs-linux-deployment/)
