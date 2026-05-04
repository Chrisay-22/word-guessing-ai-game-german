# Deployment Guide

This guide covers deploying the German Wordle Game to Google Cloud Platform.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Configuration](#configuration)
- [Deployment Methods](#deployment-methods)
  - [Method 1: Manual Deployment](#method-1-manual-deployment)
  - [Method 2: Terraform (Recommended)](#method-2-terraform-recommended)
  - [Method 3: CI/CD Pipeline](#method-3-cicd-pipeline)
- [Post-Deployment](#post-deployment)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Accounts & Tools

1. **Google Cloud Platform**
   - Active GCP account with billing enabled
   - Project with sufficient quota for Cloud Run and Vertex AI

2. **Local Tools**
   ```bash
   # Google Cloud SDK
   curl https://sdk.cloud.google.com | bash
   exec -l $SHELL
   gcloud init
   
   # Docker
   # Follow instructions at https://docs.docker.com/get-docker/
   
   # Terraform (optional)
   # Download from https://www.terraform.io/downloads.html
   ```

3. **API Enablement**
   ```bash
   gcloud services enable run.googleapis.com
   gcloud services enable artifactregistry.googleapis.com
   gcloud services enable cloudbuild.googleapis.com
   gcloud services enable aiplatform.googleapis.com
   gcloud services enable storage-api.googleapis.com
   ```

### GCP Project Setup

```bash
# Set your project ID
export PROJECT_ID="your-gcp-project-id"
gcloud config set project $PROJECT_ID

# Set default region
export REGION="europe-west3"
gcloud config set run/region $REGION
```

## Configuration

### 1. Environment Variables

Create a `.env` file (NEVER commit this):

```bash
# Core Settings
GCP_PROJECT_ID=your-gcp-project-id
GCP_REGION=europe-west3
BUCKET_NAME=your-unique-bucket-name

# Admin Access
ADMIN_PASSWORD=your-secure-admin-password

# Vertex AI
VERTEXAI_MODEL=gemini-2.0-flash-exp

# Application
ENVIRONMENT=production
FLASK_SECRET_KEY=generate-a-random-secret-key
```

### 2. Cloud Storage Bucket

```bash
# Create bucket for game data
gsutil mb -l $REGION gs://your-unique-bucket-name

# Enable versioning
gsutil versioning set on gs://your-unique-bucket-name
```

### 3. Service Account (if not using Terraform)

```bash
# Create service account
gcloud iam service-accounts create wordle-game-sa \
  --display-name="Wordle Game Service Account"

# Grant permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:wordle-game-sa@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"

gsutil iam ch \
  serviceAccount:wordle-game-sa@$PROJECT_ID.iam.gserviceaccount.com:objectAdmin \
  gs://your-unique-bucket-name
```

## Deployment Methods

### Method 1: Manual Deployment

Quickest method for testing.

#### Step 1: Build Container

```bash
# Build Docker image
docker build -t german-wordle-game .

# Test locally (optional)
docker run -p 8080:8080 \
  -e GCP_PROJECT_ID=$PROJECT_ID \
  -e GCP_REGION=$REGION \
  -e BUCKET_NAME=your-bucket-name \
  -e ADMIN_PASSWORD=test123 \
  german-wordle-game
```

#### Step 2: Create Artifact Registry Repository

```bash
# Create repository
gcloud artifacts repositories create wordle-game-repo \
  --repository-format=docker \
  --location=$REGION \
  --description="German Wordle Game images"

# Configure Docker authentication
gcloud auth configure-docker $REGION-docker.pkg.dev
```

#### Step 3: Push Image

```bash
# Tag image
docker tag german-wordle-game \
  $REGION-docker.pkg.dev/$PROJECT_ID/wordle-game-repo/app:latest

# Push to Artifact Registry
docker push $REGION-docker.pkg.dev/$PROJECT_ID/wordle-game-repo/app:latest
```

#### Step 4: Deploy to Cloud Run

```bash
gcloud run deploy german-wordle-game \
  --image=$REGION-docker.pkg.dev/$PROJECT_ID/wordle-game-repo/app:latest \
  --platform=managed \
  --region=$REGION \
  --service-account=wordle-game-sa@$PROJECT_ID.iam.gserviceaccount.com \
  --set-env-vars="GCP_PROJECT_ID=$PROJECT_ID,GCP_REGION=$REGION,BUCKET_NAME=your-bucket-name,ADMIN_PASSWORD=your-password,VERTEXAI_MODEL=gemini-2.0-flash-exp,ENVIRONMENT=production" \
  --allow-unauthenticated \
  --memory=512Mi \
  --cpu=1 \
  --max-instances=10 \
  --timeout=300
```

### Method 2: Terraform (Recommended)

Best for production and reproducible deployments.

See [terraform/README.md](terraform/README.md) for detailed instructions.

**Quick Start:**

```bash
cd terraform

# Initialize
terraform init

# Review plan
terraform plan

# Apply (creates all resources)
export TF_VAR_admin_password="your-secure-password"
terraform apply

# Get service URL
terraform output service_url
```

### Method 3: CI/CD Pipeline

For automated deployments on code changes.

#### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Cloud Run

on:
  push:
    branches: [ main ]

env:
  PROJECT_ID: ${{ secrets.GCP_PROJECT_ID }}
  REGION: europe-west3
  SERVICE_NAME: german-wordle-game

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Authenticate to Google Cloud
      uses: google-github-actions/auth@v1
      with:
        credentials_json: ${{ secrets.GCP_SA_KEY }}
    
    - name: Set up Cloud SDK
      uses: google-github-actions/setup-gcloud@v1
    
    - name: Configure Docker
      run: gcloud auth configure-docker ${{ env.REGION }}-docker.pkg.dev
    
    - name: Build and Push
      run: |
        docker build -t ${{ env.REGION }}-docker.pkg.dev/${{ env.PROJECT_ID }}/wordle-game-repo/app:${{ github.sha }} .
        docker push ${{ env.REGION }}-docker.pkg.dev/${{ env.PROJECT_ID }}/wordle-game-repo/app:${{ github.sha }}
    
    - name: Deploy to Cloud Run
      run: |
        gcloud run deploy ${{ env.SERVICE_NAME }} \
          --image=${{ env.REGION }}-docker.pkg.dev/${{ env.PROJECT_ID }}/wordle-game-repo/app:${{ github.sha }} \
          --region=${{ env.REGION }} \
          --platform=managed
```

**Required GitHub Secrets:**
- `GCP_PROJECT_ID`: Your GCP project ID
- `GCP_SA_KEY`: Service account JSON key

## Post-Deployment

### Verify Deployment

```bash
# Get service URL
gcloud run services describe german-wordle-game \
  --region=$REGION \
  --format='value(status.url)'

# Test endpoint
curl https://your-service-url.run.app/health
```

### Custom Domain (Optional)

```bash
# Map custom domain
gcloud run domain-mappings create \
  --service=german-wordle-game \
  --domain=wordle.yourdomain.com \
  --region=$REGION
```

Follow DNS configuration instructions provided by Cloud Run.

### SSL Certificate

Cloud Run automatically provisions SSL certificates for custom domains.

## Monitoring

### Cloud Console

1. Navigate to [Cloud Run Console](https://console.cloud.google.com/run)
2. Select your service
3. View metrics: Requests, Latency, Errors, Container instances

### Logs

```bash
# Stream logs
gcloud run services logs tail german-wordle-game --region=$REGION

# Filter logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=german-wordle-game" \
  --limit 50 \
  --format json
```

### Alerts (Optional)

Create alert policies in Cloud Monitoring:

```bash
# Example: High error rate alert
gcloud alpha monitoring policies create \
  --notification-channels=CHANNEL_ID \
  --display-name="Wordle High Error Rate" \
  --condition-display-name="Error rate > 5%" \
  --condition-threshold-value=5 \
  --condition-threshold-duration=300s
```

## Troubleshooting

### Common Issues

#### 1. Service Won't Start

**Check logs:**
```bash
gcloud run services logs tail german-wordle-game --region=$REGION
```

**Common causes:**
- Missing environment variables
- Incorrect bucket permissions
- Invalid Vertex AI configuration

#### 2. Permission Denied Errors

**Verify service account permissions:**
```bash
# Check service account
gcloud run services describe german-wordle-game \
  --region=$REGION \
  --format='value(spec.template.spec.serviceAccountName)'

# Verify bucket access
gsutil iam get gs://your-bucket-name
```

#### 3. Vertex AI API Errors

**Check API is enabled:**
```bash
gcloud services list --enabled | grep aiplatform
```

**Verify quota:**
- Navigate to [GCP Quotas](https://console.cloud.google.com/iam-admin/quotas)
- Check Vertex AI quota limits

#### 4. Container Build Failures

**Review build logs:**
```bash
gcloud builds list --limit=5
gcloud builds log [BUILD_ID]
```

#### 5. High Costs

**Review pricing:**
- [Cloud Run Pricing](https://cloud.google.com/run/pricing)
- [Vertex AI Pricing](https://cloud.google.com/vertex-ai/pricing)

**Optimize:**
```bash
# Reduce max instances
gcloud run services update german-wordle-game \
  --max-instances=3 \
  --region=$REGION

# Reduce memory
gcloud run services update german-wordle-game \
  --memory=256Mi \
  --region=$REGION
```

### Debug Mode

Enable debug logging:

```bash
gcloud run services update german-wordle-game \
  --update-env-vars="LOG_LEVEL=DEBUG" \
  --region=$REGION
```

## Rollback

### Revert to Previous Revision

```bash
# List revisions
gcloud run revisions list --service=german-wordle-game --region=$REGION

# Route traffic to previous revision
gcloud run services update-traffic german-wordle-game \
  --to-revisions=REVISION_NAME=100 \
  --region=$REGION
```

### Delete Deployment

```bash
# Delete Cloud Run service
gcloud run services delete german-wordle-game --region=$REGION

# Delete Artifact Registry images
gcloud artifacts docker images delete \
  $REGION-docker.pkg.dev/$PROJECT_ID/wordle-game-repo/app:latest

# If using Terraform
cd terraform
terraform destroy
```

## Security Best Practices

1. **Never commit secrets**
   - Use Secret Manager or environment variables
   - Add `.env` to `.gitignore`

2. **Restrict IAM permissions**
   - Use least privilege principle
   - Avoid `allUsers` for sensitive services

3. **Enable VPC Service Controls**
   - Additional security perimeter

4. **Regular security audits**
   ```bash
   gcloud asset search-all-iam-policies \
     --scope=projects/$PROJECT_ID
   ```

5. **Rotate credentials regularly**
   - Service account keys
   - Admin passwords
   - API keys

## Additional Resources

- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Vertex AI Documentation](https://cloud.google.com/vertex-ai/docs)
- [Container Best Practices](https://cloud.google.com/architecture/best-practices-for-building-containers)
- [Cloud Run Security](https://cloud.google.com/run/docs/securing/overview)

## Support

For issues specific to this deployment:
1. Check logs in Cloud Run Console
2. Review [Troubleshooting](#troubleshooting) section
3. Consult GCP documentation linked above
