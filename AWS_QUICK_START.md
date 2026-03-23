# AWS Deployment Quick Start

## 🚀 Get Your App Live on AWS in 5 Minutes

This is the **fastest way** to deploy BW Nexus AI to production.

### Prerequisites
- AWS Account (free tier eligible)
- GitHub account with your repo
- One AI API key (OpenAI, Groq, or Together)

---

## Step 1: Prepare Code (2 minutes)

```bash
# Ensure all changes are pushed to GitHub
cd ~/bwmetadata
git add .
git commit -m "AWS deployment ready"
git push origin main
```

✅ **Done**: Your code is on GitHub

---

## Step 2: Connect to AWS Amplify (1 minute)

1. Go to [AWS Amplify Console](https://eu-west-1.console.aws.amazon.com/amplify/apps)
2. Click **Create new app** → **Host web app**
3. Select **GitHub**
4. Authorize GitHub when prompted
5. Select repository: **braydenmw/bwmetadata**
6. Select branch: **main**
7. Click **Save and deploy**

✅ **Amplify is now connected** (no code changes needed)

---

## Step 3: Add Environment Variables (1 minute)

While Amplify builds, click **Environment variables** on the left sidebar:

### Add ONE of these AI provider options:

**Option A: OpenAI (Recommended for best quality)**
```
OPENAI_API_KEY = sk-<your-key-from-platform.openai.com>
```

**Option B: Groq (Free, ultra-fast)**
```
GROQ_API_KEY = gsk_<your-key-from-console.groq.com>
```

**Option C: Together.ai (Good quality, affordable)**
```
TOGETHER_API_KEY = <your-key-from-api.together.xyz>
```

### Also add:
```
NODE_ENV = production
PORT = 3001
FRONTEND_URL = (Amplify will fill this automatically later)
```

✅ **Variables saved** - Amplify will redeploy automatically

---

## Step 4: Wait for Deployment (1 minute)

Watch the **Deployments** tab in Amplify Console:
- ⏳ Build in progress ~3 minutes
- ✅ Frontend built
- ✅ Backend built
- 🎉 **Deployment successful!**

Amplify shows your live URL: **https://your-app.amplifyapp.com**

✅ **Your app is live!**

---

## Step 5: Test It's Working

```bash
# Replace with your actual Amplify domain
APP_URL="https://your-app.amplifyapp.com"

# Test health check
curl $APP_URL/api/health

# Test AI (if configured)
curl -X POST $APP_URL/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello"}]}'
```

✅ **Done!** Your app is now live on AWS

---

## What Just Happened?

```
GitHub (Your Code)
    ↓
AWS Amplify (Auto-detects changes, auto-builds)
    ↓
Frontend (React/Vite) → Hosted on Amplify CDN
Backend (Express/Node) → Runs on AWS Lambda
    ↓
Live at: https://your-app.amplifyapp.com
```

- **Frontend**: Served from CloudFront CDN (fast ⚡)
- **Backend**: Runs serverless (scales automatically 📈)
- **Database**: In-memory for now (add RDS later if needed)
- **Cost**: ~$1/month (with free tier credit)

---

## Common Questions

### Q: Do I need to change my code?
**A**: No! Amplify auto-detects your `amplify.yml` config

### Q: How much does this cost?
**A**: ~$1-5/month after free tier expires (includes 1 million Lambda invocations free)

### Q: Can I add my own domain?
**A**: Yes! In Amplify Console → Domain management → Add custom domain (~$12/yr)

### Q: How do I update the app?
**A**: Just push to GitHub, Amplify auto-deploys within 2 minutes

### Q: What if the build fails?
**A**: Check the build logs in Amplify Console → Deployments → View logs

### Q: Where's my data stored?
**A**: Currently in-memory (lost on Lambda restart). Add RDS PostgreSQL for persistence

---

## Next Steps

### Immediate (Today)
- ✅ Verify app is live
- ✅ Test AI features work
- ✅ Share live URL with team

### Soon (This Week)
- [ ] Add custom domain name
- [ ] Test with real data
- [ ] Enable CloudWatch monitoring (for errors)
- [ ] Set up alerts (if errors occur)

### Later (When Ready)
- [ ] Add RDS database for persistence
- [ ] Enable CloudFront for CDN caching
- [ ] Set up CloudWatch logs analysis
- [ ] Configure auto-scaling rules

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Page shows 404 | Amplify still building (~3 min) - refresh browser |
| API returns "No AI provider" | Check env vars in Amplify console, redeploy |
| Page loads but API calls fail | Check CloudWatch logs in Amplify console |
| Build times out | Increase build timeout in Amplify settings |
| Need to update code | Push to main branch, Amplify auto-deploys in 1-2 min |

---

## Live App Structure

```
Your Domain
├─ Frontend (React)
│  └─ Hosted on Amplify + CloudFront CDN
├─ API Backend (Express)
│  └─ Running on AWS Lambda (serverless)
└─ Health Checks
   ├─ /api/health (backend status)
   └─ /api/ai/readiness (AI provider status)
```

---

## Support & Resources

- **Amplify Docs**: https://docs.aws.amazon.com/amplify/
- **AWS Lambda**: https://docs.aws.amazon.com/lambda/
- **Express.js**: https://expressjs.com/
- **Troubleshooting**: Check Amplify Console logs

---

## You Did It! 🎉

Your production app is live on AWS.

**Share Your URL**: `https://your-app.amplifyapp.com`

**Monitor It**: Check Amplify Dashboard daily for errors/costs

**Scale It**: Amplify handles traffic automatically - no servers to manage!

---

**Next**: Read [AWS_DEPLOYMENT_GUIDE.md](./AWS_DEPLOYMENT_GUIDE.md) for advanced setup (databases, monitoring, custom domains, etc.)
