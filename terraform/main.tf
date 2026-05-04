# ============================================================================
# EXAMPLE Terraform Configuration for German Wordle Game
# ============================================================================
# This is a TEMPLATE configuration. Replace all placeholder values with your
# actual GCP project details before applying.
#
# Required: Configure GCP authentication first:
# gcloud auth application-default login
# ============================================================================

terraform {
  required_version = ">= 1.0"
  
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
  
  # OPTIONAL: Configure remote state backend
  # backend "gcs" {
  #   bucket = "your-terraform-state-bucket"
  #   prefix = "terraform/state"
  # }
}

# ============================================================================
# Provider Configuration
# ============================================================================

provider "google" {
  project = var.project_id
  region  = var.region
}

# ============================================================================
# Variables
# ============================================================================

variable "project_id" {
  description = "GCP Project ID"
  type        = string
  default     = "your-gcp-project-id"  # REPLACE THIS
}

variable "region" {
  description = "GCP region for resources"
  type        = string
  default     = "europe-west3"
}

variable "service_name" {
  description = "Name of the Cloud Run service"
  type        = string
  default     = "german-wordle-game"
}

variable "bucket_name" {
  description = "Name of the Cloud Storage bucket for game data"
  type        = string
  default     = "your-wordle-game-data"  # REPLACE THIS (must be globally unique)
}

variable "admin_password" {
  description = "Admin password for game management"
  type        = string
  sensitive   = true
  # Set via environment variable: TF_VAR_admin_password
}

# ============================================================================
# Cloud Storage Bucket for Game Data
# ============================================================================

resource "google_storage_bucket" "game_data" {
  name          = var.bucket_name
  location      = var.region
  force_destroy = false
  
  uniform_bucket_level_access = true
  
  versioning {
    enabled = true
  }
  
  lifecycle_rule {
    condition {
      age = 90  # Delete versions older than 90 days
    }
    action {
      type = "Delete"
    }
  }
}

# ============================================================================
# Service Account for Cloud Run
# ============================================================================

resource "google_service_account" "cloud_run_sa" {
  account_id   = "${var.service_name}-sa"
  display_name = "Service Account for ${var.service_name}"
  description  = "Used by Cloud Run service to access GCP resources"
}

# Grant Storage Object User role to service account
resource "google_storage_bucket_iam_member" "cloud_run_storage_access" {
  bucket = google_storage_bucket.game_data.name
  role   = "roles/storage.objectUser"
  member = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

# Grant Vertex AI User role to service account
resource "google_project_iam_member" "cloud_run_vertex_ai" {
  project = var.project_id
  role    = "roles/aiplatform.user"
  member  = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

# ============================================================================
# Artifact Registry Repository (for Docker images)
# ============================================================================

resource "google_artifact_registry_repository" "app_repo" {
  location      = var.region
  repository_id = "${var.service_name}-repo"
  description   = "Docker repository for ${var.service_name}"
  format        = "DOCKER"
}

# ============================================================================
# Cloud Run Service
# ============================================================================

resource "google_cloud_run_service" "app" {
  name     = var.service_name
  location = var.region
  
  template {
    spec {
      service_account_name = google_service_account.cloud_run_sa.email
      
      containers {
        # REPLACE with your actual image path after building and pushing
        image = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.app_repo.repository_id}/app:latest"
        
        ports {
          container_port = 8080
        }
        
        env {
          name  = "GCP_PROJECT_ID"
          value = var.project_id
        }
        
        env {
          name  = "GCP_REGION"
          value = var.region
        }
        
        env {
          name  = "BUCKET_NAME"
          value = google_storage_bucket.game_data.name
        }
        
        env {
          name  = "ADMIN_PASSWORD"
          value = var.admin_password
        }
        
        env {
          name  = "VERTEXAI_MODEL"
          value = "gemini-2.0-flash-exp"
        }
        
        env {
          name  = "ENVIRONMENT"
          value = "production"
        }
        
        resources {
          limits = {
            cpu    = "1000m"
            memory = "512Mi"
          }
        }
      }
    }
    
    metadata {
      annotations = {
        "autoscaling.knative.dev/maxScale"      = "10"
        "run.googleapis.com/cpu-throttling"     = "false"
        "run.googleapis.com/startup-cpu-boost"  = "true"
      }
    }
  }
  
  traffic {
    percent         = 100
    latest_revision = true
  }
  
  # Prevent accidental deletion
  lifecycle {
    prevent_destroy = false  # Set to true in production
  }
}

# ============================================================================
# Cloud Run IAM - Public Access (adjust as needed)
# ============================================================================

resource "google_cloud_run_service_iam_member" "public_access" {
  location = google_cloud_run_service.app.location
  project  = google_cloud_run_service.app.project
  service  = google_cloud_run_service.app.name
  role     = "roles/run.invoker"
  member   = "allUsers"  # WARNING: This makes the service publicly accessible
}

# For restricted access, use instead:
# resource "google_cloud_run_service_iam_member" "authenticated_access" {
#   location = google_cloud_run_service.app.location
#   service  = google_cloud_run_service.app.name
#   role     = "roles/run.invoker"
#   member   = "allAuthenticatedUsers"
# }

# ============================================================================
# Enable Required APIs
# ============================================================================

resource "google_project_service" "required_apis" {
  for_each = toset([
    "run.googleapis.com",
    "artifactregistry.googleapis.com",
    "cloudbuild.googleapis.com",
    "aiplatform.googleapis.com",
    "storage-api.googleapis.com",
  ])
  
  service            = each.key
  disable_on_destroy = false
}

# ============================================================================
# Outputs
# ============================================================================

output "service_url" {
  description = "URL of the deployed Cloud Run service"
  value       = google_cloud_run_service.app.status[0].url
}

output "service_account_email" {
  description = "Email of the service account used by Cloud Run"
  value       = google_service_account.cloud_run_sa.email
}

output "bucket_name" {
  description = "Name of the Cloud Storage bucket"
  value       = google_storage_bucket.game_data.name
}

output "artifact_registry_repo" {
  description = "Artifact Registry repository URL"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.app_repo.repository_id}"
}
