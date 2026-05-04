# Terraform Infrastructure

This directory contains Terraform configuration for deploying the German Wordle game to Google Cloud Platform.

## ⚠️ Important Notice

**This is an EXAMPLE configuration.** You MUST customize it with your own GCP project details before use.

## Prerequisites

1. **Google Cloud Platform Account**
   - Active GCP project with billing enabled
   - Sufficient permissions to create resources

2. **Tools Installed**
   - [Terraform](https://www.terraform.io/downloads.html) >= 1.0
   - [Google Cloud SDK](https://cloud.google.com/sdk/docs/install)

3. **Authentication**
   ```bash
   # Authenticate with GCP
   gcloud auth application-default login
   
   # Set your project
   gcloud config set project YOUR_PROJECT_ID
   ```

## Configuration Steps

### 1. Update Variables

Edit `main.tf` and replace placeholder values:

```hcl
variable "project_id" {
  default = "your-gcp-project-id"  # ← CHANGE THIS
}

variable "bucket_name" {
  default = "your-wordle-game-data"  # ← CHANGE THIS (must be globally unique)
}
```

### 2. Set Admin Password

Set the admin password via environment variable (DO NOT commit passwords):

```bash
export TF_VAR_admin_password="your-secure-password"
```

### 3. Build and Push Docker Image

Before running Terraform, build and push your Docker image:

```bash
# Authenticate Docker with Artifact Registry
gcloud auth configure-docker europe-west3-docker.pkg.dev

# Build image
docker build -t german-wordle-game .

# Tag image (update region/project/repo as needed)
docker tag german-wordle-game \
  europe-west3-docker.pkg.dev/YOUR_PROJECT_ID/german-wordle-game-repo/app:latest

# Push image
docker push europe-west3-docker.pkg.dev/YOUR_PROJECT_ID/german-wordle-game-repo/app:latest
```

## Deployment

### Initialize Terraform

```bash
cd terraform
terraform init
```

### Plan Changes

Review what will be created:

```bash
terraform plan
```

### Apply Configuration

Deploy the infrastructure:

```bash
terraform apply
```

Type `yes` when prompted to confirm.

### Get Service URL

After successful deployment:

```bash
terraform output service_url
```

## Resources Created

This Terraform configuration creates:

- **Cloud Storage Bucket**: Stores game data (words, scores)
- **Service Account**: For Cloud Run with necessary permissions
- **Artifact Registry**: Docker image repository
- **Cloud Run Service**: Hosts the application
- **IAM Bindings**: Grants necessary permissions

## Cost Considerations

Approximate monthly costs (as of 2024):

- **Cloud Storage**: ~$0.02/GB
- **Cloud Run**: ~$0.40/million requests (with 1 CPU, 512MB RAM)
- **Vertex AI**: Pay-per-use for word generation
- **Artifact Registry**: ~$0.10/GB

Always-free tier typically covers light usage. Monitor costs in GCP Console.

## Security Best Practices

1. **Never commit secrets to Git**
   - Use environment variables or Secret Manager
   - Add `.env` to `.gitignore`

2. **Restrict Cloud Run Access**
   - Remove `allUsers` IAM binding if not needed publicly
   - Use Cloud IAP or Firebase Authentication

3. **Enable VPC Service Controls** (optional)
   - For additional security layer

4. **Rotate Admin Password Regularly**

5. **Enable Audit Logging**
   - Monitor who accesses your GCP resources

## Cleanup

To destroy all resources:

```bash
terraform destroy
```

**Warning**: This will delete all data including game history!

## Customization

### Scaling

Adjust in `main.tf`:

```hcl
metadata {
  annotations = {
    "autoscaling.knative.dev/maxScale" = "10"  # Max instances
  }
}
```

### Resources

```hcl
resources {
  limits = {
    cpu    = "2000m"  # 2 vCPUs
    memory = "1024Mi" # 1 GB RAM
  }
}
```

### Region

Change `region` variable in `main.tf`:

```hcl
variable "region" {
  default = "us-central1"  # or your preferred region
}
```

## Troubleshooting

### API Not Enabled Error

Enable required APIs manually:

```bash
gcloud services enable run.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable aiplatform.googleapis.com
```

### Insufficient Permissions

Ensure your GCP account has these roles:
- `roles/editor` or
- Individual roles: `roles/run.admin`, `roles/storage.admin`, `roles/iam.serviceAccountAdmin`

### Bucket Name Already Exists

Cloud Storage bucket names are globally unique. Choose a different name.

## Additional Resources

- [Terraform GCP Provider Documentation](https://registry.terraform.io/providers/hashicorp/google/latest/docs)
- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Vertex AI Documentation](https://cloud.google.com/vertex-ai/docs)

## State Management

For production, use remote state backend:

```hcl
terraform {
  backend "gcs" {
    bucket = "your-terraform-state-bucket"
    prefix = "terraform/state"
  }
}
```

Create the state bucket first:

```bash
gsutil mb gs://your-terraform-state-bucket
gsutil versioning set on gs://your-terraform-state-bucket
```
