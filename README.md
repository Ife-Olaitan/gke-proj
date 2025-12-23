# GKE Project: Color API with MongoDB

A complete Kubernetes deployment project for Google Kubernetes Engine (GKE) featuring a Node.js Color API application backed by MongoDB. This project demonstrates production-ready Kubernetes patterns including Kustomize overlays for environment management, network policies, StatefulSets for stateful workloads, and secrets management.

## Table of Contents

- [Project Overview](#project-overview)
- [Directory Structure](#directory-structure)
- [Architecture](#architecture)
- [Kubernetes Resources](#kubernetes-resources)
- [Environment Overlays](#environment-overlays)
- [Configuration Management](#configuration-management)
- [Deployment Guide](#deployment-guide)
- [Network Policies](#network-policies)

## Project Overview

This GKE project provides a complete, production-ready deployment configuration for a microservices architecture with the following components:

- **Color API**: Node.js Express REST API application
- **MongoDB**: Document database backend with StatefulSet deployment
- **Multi-Environment Support**: Separate configurations for dev and prod environments
- **Network Security**: NetworkPolicies for pod-to-pod communication control
- **Secret Management**: Credential handling for database access

### Key Features

- **Kustomize-based Configuration**: Declarative environment management using Kubernetes Kustomize
- **StatefulSet for Persistence**: MongoDB deployed as StatefulSet with persistent volumes
- **Network Policies**: Fine-grained ingress/egress control for security
- **Resource Requests/Limits**: Defined CPU and memory requirements for all workloads
- **Secrets Management**: Secure credential storage using Kubernetes Secrets
- **Environment-specific Overrides**: Image versions, replica counts, and storage classes vary by environment

## Directory Structure

```
gke-proj/
├── _color-api-app/              # Application source code
│   ├── src/
│   │   ├── index.js            # Main application entry point
│   │   ├── utils.js            # Utility functions
│   │   ├── routes/
│   │   │   ├── api.js          # API endpoints
│   │   │   ├── health.js       # Health check endpoints
│   │   │   └── root.js         # Root route
│   │   └── db/
│   │       └── color.js        # Database models
│   ├── Dockerfile              # Container image definition
│   ├── package.json            # Node.js dependencies
│   └── package-lock.json       # Dependency lock file
│
├── color-api/                   # Color API Kustomize configuration
│   ├── _base/                  # Base configuration
│   │   ├── kustomization.yaml  # Base Kustomization manifest
│   │   ├── color-api.yaml      # Deployment resource
│   │   ├── color-svc.yaml      # Service resource
│   │   └── network-policies/
│   │       └── allow-external-access.yaml  # NetworkPolicy for API
│   ├── dev/                    # Development overlay
│   │   ├── kustomization.yaml
│   │   └── use-dev-image.yaml  # Dev-specific image patch
│   └── prod/                   # Production overlay
│       ├── kustomization.yaml
│       └── increase-replica-count.yaml  # Prod replica scaling
│
├── color-db/                    # MongoDB Kustomize configuration
│   ├── _base/                  # Base configuration
│   │   ├── kustomization.yaml  # Base Kustomization manifest
│   │   ├── mongodb-ss.yaml     # StatefulSet resource
│   │   ├── mongodb-svc.yaml    # Service resource
│   │   ├── mongo-init.js       # MongoDB initialization script
│   │   └── network-policies/
│   │       └── allow-color-api.yaml  # NetworkPolicy for DB
│   ├── dev/                    # Development overlay
│   │   └── kustomization.yaml
│   └── prod/                   # Production overlay
│       ├── kustomization.yaml
│       └── use-premium-storage.yaml  # Prod storage class patch
│
├── namespaces/                  # Namespace definitions
│   ├── dev.yaml                # Development namespace
│   └── prod.yaml               # Production namespace
│
├── shared-config/               # Shared configuration across components
│   ├── _network-policies/      # Global network policies
│   │   ├── kustomization.yaml
│   │   └── deny-ingress.yaml   # Default deny-all policy
│   ├── dev/                    # Dev credentials and secrets
│   │   ├── kustomization.yaml
│   │   ├── .env.root-creds.dev
│   │   └── .env.colordb-creds.dev
│   └── prod/                   # Prod credentials and secrets
│       ├── kustomization.yaml
│       ├── .env.root-creds.prod
│       └── .env.colordb-creds.prod
│
├── .gitignore
└── README.md                    # This file
```

## Architecture

### Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    GKE Cluster                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐              ┌──────────────────┐     │
│  │   Namespace:     │              │   Namespace:     │     │
│  │      dev         │              │      prod        │     │
│  ├──────────────────┤              ├──────────────────┤     │
│  │                  │              │                  │     │
│  │  ┌────────────┐  │              │  ┌────────────┐  │     │
│  │  │ color-api  │  │              │  │ color-api  │  │     │
│  │  │ Deployment │  │              │  │ Deployment │  │     │
│  │  │ (1 replica)│  │              │  │ (3 replicas)│ │     │
│  │  └────────────┘  │              │  └────────────┘  │     │
│  │         ↓        │              │         ↓        │     │
│  │  ┌────────────┐  │              │  ┌────────────┐  │     │
│  │  │ color-svc  │  │              │  │ color-svc  │  │     │
│  │  │LoadBalancer│  │              │  │LoadBalancer│  │     │
│  │  └────────────┘  │              │  └────────────┘  │     │
│  │         ↓        │              │         ↓        │     │
│  │  ┌────────────┐  │              │  ┌────────────┐  │     │
│  │  │ mongodb-ss │  │              │  │ mongodb-ss │  │     │
│  │  │StatefulSet │  │              │  │StatefulSet │  │     │
│  │  │(1 replica) │  │              │  │(1 replica) │  │     │
│  │  │ + PVC(10Gi)│  │              │  │ + PVC(10Gi)│  │     │
│  │  │[standard]  │  │              │  │[premium]   │  │     │
│  │  └────────────┘  │              │  └────────────┘  │     │
│  │         ↓        │              │         ↓        │     │
│  │  ┌────────────┐  │              │  ┌────────────┐  │     │
│  │  │mongodb-svc │  │              │  │mongodb-svc │  │     │
│  │  │ Headless   │  │              │  │ Headless   │  │     │
│  │  │ Service    │  │              │  │ Service    │  │     │
│  │  └────────────┘  │              │  └────────────┘  │     │
│  │                  │              │                  │     │
│  └──────────────────┘              └──────────────────┘     │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Application Stack

- **Runtime**: Node.js (Alpine)
- **Framework**: Express.js
- **Database**: MongoDB 8.0.0
- **ORM/ODM**: Mongoose
- **Monitoring**: Prometheus (express-prom-bundle)
- **Port**: 80 (HTTP)

## Kubernetes Resources

### Kubernetes Resource Types Used

#### 1. **Namespaces**
- `dev`: Development environment namespace
- `prod`: Production environment namespace

#### 2. **Deployments**

**Color API Deployment** (`color-api/_base/color-api.yaml`)
- **Name**: color-api
- **Image**: ifeolaitan/color-api:2.0.1 (overridden per environment)
- **Replicas**: 
  - Dev: 1 (default)
  - Prod: 3 (patched via increase-replica-count.yaml)
- **Resource Requests**:
  - Memory: 64Mi
  - CPU: 250m
- **Resource Limits**:
  - Memory: 128Mi
  - CPU: 500m
- **Ports**: 80
- **Environment Variables**:
  - `DB_USER`: From Secret (mongodb-colordb-creds)
  - `DB_PASSWORD`: From Secret (mongodb-colordb-creds)
  - `DB_URL`: MongoDB connection string
- **Labels**: app: color-api, project: gke-proj

#### 3. **StatefulSets**

**MongoDB StatefulSet** (`color-db/_base/mongodb-ss.yaml`)
- **Name**: mongodb-ss
- **Image**: mongo:8.0.0
- **Replicas**: 1
- **Service Name**: mongodb-svc (for DNS discovery)
- **Resource Requests**:
  - Memory: 2Gi
  - CPU: 500m
- **Resource Limits**:
  - Memory: 4Gi
  - CPU: 1 core
- **Ports**: 27017
- **Environment Variables**:
  - `MONGO_INITDB_ROOT_USERNAME`: From Secret (mongodb-root-creds)
  - `MONGO_INITDB_ROOT_PASSWORD`: From Secret (mongodb-root-creds)
  - `DB_NAME`: colordb
  - `DB_USER`: From Secret (mongodb-colordb-creds)
  - `DB_PASSWORD`: From Secret (mongodb-colordb-creds)
- **Volume Mounts**:
  - `/docker-entrypoint-initdb.d`: MongoDB initialization scripts (from ConfigMap)
- **Persistent Volume Claims**:
  - `mongodb-data`: 10Gi storage
  - Storage Class:
    - Dev: standard-rwo
    - Prod: premium-rwo (patched via use-premium-storage.yaml)
- **Node Affinity**: Restricted to zones: europe-west2-a, europe-west2-b, europe-west2-c
- **Labels**: app: mongodb, project: gke-proj

#### 4. **Services**

**Color API Service** (`color-api/_base/color-svc.yaml`)
- **Name**: color-svc
- **Type**: LoadBalancer
- **Selector**: app: color-api
- **Ports**: 80 → 80

**MongoDB Service** (`color-db/_base/mongodb-svc.yaml`)
- **Name**: mongodb-svc
- **Type**: ClusterIP (None - Headless)
- **Selector**: app: mongodb
- **Ports**: 27017 → 27017
- **Purpose**: Enables StatefulSet DNS discovery (mongodb-ss-0.mongodb-svc)

#### 5. **ConfigMaps**

**MongoDB Initialization ConfigMap** (`color-db/_base/kustomization.yaml`)
- **Name**: mongodb-init-colordb
- **Source**: mongo-init.js
- **Purpose**: Contains JavaScript initialization script for MongoDB database and user creation

#### 6. **Secrets**

Generated via Kustomize SecretGenerator from environment files:

**Dev Secrets** (`shared-config/dev/kustomization.yaml`):
- `mongodb-root-creds`: From .env.root-creds.dev
  - USERNAME: MongoDB root user
  - PASSWORD: MongoDB root password
- `mongodb-colordb-creds`: From .env.colordb-creds.dev
  - USERNAME: Application database user
  - PASSWORD: Application database password

**Prod Secrets** (`shared-config/prod/kustomization.yaml`):
- `mongodb-root-creds`: From .env.root-creds.prod
- `mongodb-colordb-creds`: From .env.colordb-creds.prod

**Note**: generatorOptions.disableNameSuffixHash: true prevents Kustomize from adding hash suffixes to secret names, allowing them to be referenced by static names.

#### 7. **NetworkPolicies**

**Default Deny Policy** (`shared-config/_network-policies/deny-ingress.yaml`)
- **Name**: deny-ingress
- **Applies To**: All pods (empty podSelector)
- **Effect**: Denies all ingress traffic by default (whitelist approach)

**Color API Ingress Policy** (`color-api/_base/network-policies/allow-external-access.yaml`)
- **Name**: allow-external-access
- **Applies To**: Pods with label app: color-api
- **Effect**: Allows all ingress traffic to color-api (external access enabled)
- **Purpose**: Permits external requests to the API endpoint

**MongoDB Ingress Policy** (`color-db/_base/network-policies/allow-color-api.yaml`)
- **Name**: allow-color-api
- **Applies To**: Pods with label app: mongodb
- **Effect**: Allows ingress only from pods with label app: color-api
- **Purpose**: Restricts database access to only the color-api application

## Environment Overlays

This project uses Kustomize overlays to manage environment-specific configurations. The structure follows the recommended pattern:

```
component/
├── _base/          # Base/common configuration
├── dev/            # Development overlay
└── prod/           # Production overlay
```

### Development Environment

**Target**: `color-api/dev/` + `color-db/dev/`

**Characteristics**:
- Namespace: dev
- Color API replicas: 1 (default)
- Color API image: ifeolaitan/color-api:2.1.0
- MongoDB storage: standard-rwo (standard provisioned storage)
- Secrets: From shared-config/dev
- Network policies: Include global deny-all policy

**Build Command**:
```bash
kustomize build color-api/dev
kustomize build color-db/dev
kustomize build shared-config/dev
```

### Production Environment

**Target**: `color-api/prod/` + `color-db/prod/`

**Characteristics**:
- Namespace: prod
- Color API replicas: 3 (for high availability)
- Color API image: ifeolaitan/color-api:2.0.1 (stable version)
- MongoDB storage: premium-rwo (premium SSD storage)
- Secrets: From shared-config/prod
- Network policies: Include global deny-all policy

**Build Command**:
```bash
kustomize build color-api/prod
kustomize build color-db/prod
kustomize build shared-config/prod
```

### Overlay Details

#### Color API Dev Overlay
- **Base**: References color-api/_base
- **Patches**: use-dev-image.yaml (updates image to 2.1.0)
- **Namespace**: dev

#### Color API Prod Overlay
- **Base**: References color-api/_base
- **Patches**: increase-replica-count.yaml (sets replicas to 3)
- **Namespace**: prod

#### Color DB Dev Overlay
- **Base**: References color-db/_base
- **Patches**: None (uses defaults)
- **Namespace**: dev

#### Color DB Prod Overlay
- **Base**: References color-db/_base
- **Patches**: use-premium-storage.yaml (changes storage class to premium-rwo)
- **Namespace**: prod
- **Target**: Specifically targets StatefulSet volumeClaimTemplates

## Configuration Management

### Kustomization Files

#### color-api/_base/kustomization.yaml
```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - color-api.yaml
  - color-svc.yaml
  - ./network-policies/allow-external-access.yaml

labels:
  - pairs:
      app: color-api
      project: gke-proj
```

**Purpose**: Defines base resources and common labels for color-api application

#### color-db/_base/kustomization.yaml
```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - mongodb-svc.yaml
  - mongodb-ss.yaml
  - ./network-policies/allow-color-api.yaml

labels:
  - pairs:
      app: mongodb
      project: gke-proj

configMapGenerator:
  - name: mongodb-init-colordb
    files:
      - mongo-init.js
```

**Purpose**: Defines base resources, labels, and generates ConfigMap for MongoDB initialization

#### shared-config/dev/kustomization.yaml
```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: dev

resources:
  - ../_network-policies

generatorOptions:
  disableNameSuffixHash: true

secretGenerator:
  - name: mongodb-root-creds
    envs:
      - .env.root-creds.dev
  - name: mongodb-colordb-creds
    envs:
      - .env.colordb-creds.dev
```

**Purpose**: 
- Manages secrets from environment files
- Applies global network policies
- Sets dev namespace
- Disables hash suffixes for predictable secret names

#### shared-config/prod/kustomization.yaml
**Purpose**: Identical to dev but references .prod environment files and sets prod namespace

### Patch Files

#### color-api/dev/use-dev-image.yaml
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: color-api
  labels:
    app: color-api
spec:
  template:
    spec:
      containers:
        - name: color-api-container
          image: ifeolaitan/color-api:2.1.0
```

**Purpose**: Patches the color-api deployment to use dev image tag (2.1.0)

#### color-api/prod/increase-replica-count.yaml
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: color-api
  labels:
    app: color-api
spec:
  replicas: 3
```

**Purpose**: Patches the color-api deployment to use 3 replicas in production

#### color-db/prod/use-premium-storage.yaml
```yaml
- op: replace
  path: /spec/volumeClaimTemplates/0/spec/storageClassName
  value: premium-rwo
```

**Purpose**: JSON Patch operation to replace standard-rwo storage class with premium-rwo in StatefulSet

### Secret Management

Secrets are stored as environment files and generated at build time via Kustomize:

**Development Files**:
- `shared-config/dev/.env.root-creds.dev`: MongoDB root credentials
- `shared-config/dev/.env.colordb-creds.dev`: Application database credentials

**Production Files**:
- `shared-config/prod/.env.root-creds.prod`: MongoDB root credentials
- `shared-config/prod/.env.colordb-creds.prod`: Application database credentials

**Format** (example .env file):
```
USERNAME=user
PASSWORD=password
```

**Security Notes**:
- Environment files should be stored in a secure secrets management system (not in git)
- Consider using tools like:
  - Sealed Secrets
  - External Secrets Operator
  - Google Secret Manager
  - HashiCorp Vault

## Deployment Guide

### Prerequisites

- GKE cluster running (kubectl configured)
- Kustomize installed (kubectl has built-in support)
- MongoDB initialization files configured

### Deploy Dev Environment

```bash
# Create namespaces
kubectl apply -f namespaces/dev.yaml

# Deploy shared configuration (secrets and network policies)
kubectl apply -k shared-config/dev

# Deploy color-db
kubectl apply -k color-db/dev

# Deploy color-api
kubectl apply -k color-api/dev
```

### Deploy Prod Environment

```bash
# Create namespaces
kubectl apply -f namespaces/prod.yaml

# Deploy shared configuration (secrets and network policies)
kubectl apply -k shared-config/prod

# Deploy color-db
kubectl apply -k color-db/prod

# Deploy color-api
kubectl apply -k color-api/prod
```

### Verify Deployments

```bash
# Check namespaces
kubectl get namespaces

# Check pods in dev
kubectl get pods -n dev

# Check pods in prod
kubectl get pods -n prod

# Check services
kubectl get svc -n dev
kubectl get svc -n prod

# Check StatefulSet status
kubectl get statefulset -n dev
kubectl get statefulset -n prod

# Verify MongoDB is running
kubectl logs -n dev mongodb-ss-0 -f
kubectl logs -n prod mongodb-ss-0 -f

# Test Color API
kubectl logs -n dev -l app=color-api -f
kubectl logs -n prod -l app=color-api -f
```

### Access the Application

```bash
# Get LoadBalancer IP (dev)
kubectl get svc color-svc -n dev

# Get LoadBalancer IP (prod)
kubectl get svc color-svc -n prod

# Once you have the EXTERNAL-IP, access via:
curl http://<EXTERNAL-IP>/
```

## Network Policies

This project implements a security-first network policy approach:

### Policy Strategy: "Whitelist" or "Default Deny"

1. **Global Default**: All pods deny ingress traffic by default (`shared-config/_network-policies/deny-ingress.yaml`)
2. **Exceptions**: Specific NetworkPolicies explicitly allow required traffic

### Policy Implementation

**Default Deny for All Pods**
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-ingress
spec:
  podSelector: {}  # Applies to all pods
  policyTypes:
  - Ingress
  # No ingress rules = deny all
```

**Allow External Access to Color API**
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-external-access
spec:
  podSelector:
    matchLabels:
      app: color-api
  policyTypes:
  - Ingress
  ingress:
    - {}  # Allow from any source
```

**Allow Color API to Access MongoDB**
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-color-api
spec:
  podSelector:
    matchLabels:
      app: mongodb
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: color-api
```

### Traffic Flow

```
External Traffic
    ↓
[color-svc LoadBalancer]
    ↓
[color-api pods] ← allow-external-access permits this
    ↓
[mongodb pods] ← allow-color-api permits this (from color-api only)
```

### Network Policy Notes

- Network policies require a network plugin that supports them (GKE default networking supports NetworkPolicies)
- Policies are applied per namespace
- Both dev and prod environments share the same network policy structure
- Egress policies are not explicitly defined (allowing all egress)

## Application Details

### Color API Application

**Framework**: Express.js
**Main File**: `_color-api-app/src/index.js`

**Features**:
- REST API endpoints via `/api` route
- Health check endpoints via `/` and `/health`
- Prometheus metrics collection
- MongoDB connection with Mongoose
- Support for delayed startup (via DELAY_STARTUP env var)

**Dependencies**:
- express: Web framework
- mongoose: MongoDB ODM
- body-parser: JSON parsing
- express-prom-bundle: Prometheus metrics

**Health Endpoints**:
- GET `/`: Root route
- GET `/health`: Health check
- GET `/api/*`: API routes

### MongoDB Initialization

**Initialization Script**: `color-db/_base/mongo-init.js`

**Functions**:
- Creates MongoDB database (colordb)
- Creates application user with limited permissions
- Grants readWrite role to application user on colordb database

```javascript
db.createUser({
    user: dbUser,
    pwd: dbPassword,
    roles: [{
        role: 'readWrite',
        db: dbName
    }]
});
```

**Execution**: Script runs automatically when MongoDB pod starts (via ConfigMap mounted to `/docker-entrypoint-initdb.d`)

## Best Practices Implemented

1. **Separation of Concerns**: Base and overlay separation for config reusability
2. **Resource Management**: Requests and limits defined for all containers
3. **Security**: 
   - NetworkPolicies for traffic control
   - Secrets for credential storage
   - No hardcoded passwords
4. **Scalability**: Overlay-based environment scaling (1 replica dev, 3 replicas prod)
5. **Storage Strategy**: Different storage classes per environment (standard vs premium)
6. **Node Affinity**: MongoDB restricted to specific GCP zones
7. **Secrets Management**: Secrets generated from environment files (not in manifests)
8. **Health Checks**: API includes health check endpoints
9. **Metrics**: Prometheus integration for monitoring

## Troubleshooting

### MongoDB Connection Issues
```bash
# Check MongoDB logs
kubectl logs -n dev mongodb-ss-0

# Verify MongoDB service
kubectl get svc -n dev mongodb-svc

# Test MongoDB connectivity from color-api pod
kubectl exec -it -n dev <color-api-pod> -- /bin/sh
# Inside pod: nslookup mongodb-ss-0.mongodb-svc.dev.svc.cluster.local
```

### Secrets Not Found
```bash
# Verify secrets exist
kubectl get secrets -n dev
kubectl get secrets -n prod

# Check secret data
kubectl describe secret mongodb-colordb-creds -n dev
```

### Network Policy Issues
```bash
# Test network connectivity between pods
kubectl run -it --rm debug --image=busybox --restart=Never -n dev -- sh
# Inside pod: telnet mongodb-ss-0.mongodb-svc 27017
```

### Image Pull Issues
```bash
# Check image availability
docker pull ifeolaitan/color-api:2.0.1
docker pull ifeolaitan/color-api:2.1.0
docker pull mongo:8.0.0
```
