# AWS Production Deployment Guide for PocketPilot

> [!NOTE]
> **Deployment Status**: This guide outlines the exact, battle-tested blueprint for deploying PocketPilot on AWS. No AWS resources (EC2 instances, Load Balancers, RDS instances, or ACM certificates) have been pre-provisioned or claimed as active. Follow the steps below to provision and deploy to production.

---

## 1. Target Cloud Architecture

```
Internet (Clients)
       │  HTTPS (Port 443)
       ▼
[ AWS Application Load Balancer ] (Public Subnet)
       │  - TLS Termination with ACM Certificate (*.duckdns.org / pocketpilot.duckdns.org)
       │  - HTTP:80 to HTTPS:443 Automatic Redirection
       │  - Target Group Health Checks on /healthz
       ▼
 ┌───────────────────────┴───────────────────────┐
 │ (HTTP:80)                                     │ (HTTP:80)
 ▼                                               ▼
[ EC2 Instance A (AZ 1) ]             [ EC2 Instance B (AZ 2) ]
(Private/Public Subnet)               (Private/Public Subnet)
 ├─ Nginx (Port 80)                    ├─ Nginx (Port 80)
 ├─ React Vite Frontend                ├─ React Vite Frontend
 └─ FastAPI Backend (Port 8000)        └─ FastAPI Backend (Port 8000)
       │                                               │
       └───────────────────────┬───────────────────────┘
                               │  PostgreSQL (Port 5432)
                               ▼
            [ Amazon RDS PostgreSQL 16 Multi-AZ ]
                    (Isolated Private Subnet)
```

---

## 2. Shared Database Configuration (Amazon RDS)

To support multiple application instances, **never run isolated SQLite or independent PostgreSQL instances on individual EC2 servers**. A shared, managed relational database ensures data consistency across all backend nodes.

### Provisioning Amazon RDS PostgreSQL:
1. Navigate to **RDS** &rarr; **Create Database**.
2. **Engine**: PostgreSQL 16.
3. **Template**: Free Tier or Production (db.t4g.micro or db.t4g.small).
4. **Settings**:
   - DB instance identifier: `pocketpilot-prod-db`
   - Master username: `pocketpilot_admin`
   - Master password: `<Generate 32-character secure random password>`
5. **Connectivity**:
   - Virtual Private Cloud (VPC): Default or Custom VPC.
   - Public access: **No** (Enforces private networking).
   - VPC Security Group: `pocketpilot-rds-sg`.
6. **Initial Database Name**: `pocketpilot_db`.

---

## 3. Security Group Strategy

Implement the principle of least privilege across three isolated tiers:

### Tier 1: ALB Security Group (`pocketpilot-alb-sg`)
| Type | Port Range | Source | Purpose |
| :--- | :--- | :--- | :--- |
| Inbound HTTP | 80 | `0.0.0.0/0` | HTTP traffic (redirected to HTTPS) |
| Inbound HTTPS | 443 | `0.0.0.0/0` | Secure public student access |
| Outbound All | All | `0.0.0.0/0` | Forwarding to EC2 target instances |

### Tier 2: EC2 Security Group (`pocketpilot-ec2-sg`)
| Type | Port Range | Source | Purpose |
| :--- | :--- | :--- | :--- |
| Inbound HTTP | 80 | `pocketpilot-alb-sg` | Only accepts traffic forwarded by ALB |
| Inbound SSH | 22 | `Your-Office-Or-Home-IP/32` | Administrative maintenance |
| Outbound All | All | `0.0.0.0/0` | Package downloads, RDS queries, CloudWatch |

### Tier 3: RDS Security Group (`pocketpilot-rds-sg`)
| Type | Port Range | Source | Purpose |
| :--- | :--- | :--- | :--- |
| Inbound PostgreSQL | 5432 | `pocketpilot-ec2-sg` | Strictly allows connections from EC2 app instances |
| Outbound All | - | - | None needed |

---

## 4. Domain & TLS Certificate Setup (`pocketpilot.duckdns.org`)

### Step 1: Configure DuckDNS
1. Log in to [DuckDNS](https://www.duckdns.org).
2. Create or verify the domain subdomain: `pocketpilot`.
3. Point `pocketpilot.duckdns.org` to:
   - **Option A (ALB)**: Create a CNAME record pointing to your AWS Application Load Balancer DNS name (e.g. `pocketpilot-alb-123456789.us-east-1.elb.amazonaws.com`).
   - **Option B (Direct EC2 Elastic IP)**: Set the A record to your EC2 Elastic IP address.

### Step 2: Request TLS Certificate in AWS Certificate Manager (ACM)
1. Navigate to **AWS Certificate Manager (ACM)** in `us-east-1` (or your target deployment region).
2. Click **Request Certificate** &rarr; **Request a public certificate**.
3. Fully qualified domain name: `pocketpilot.duckdns.org`.
4. Validation method: **DNS Validation** (Recommended) or **Email Validation**.
5. Retrieve the CNAME name and CNAME value provided by ACM.
6. Add the validation CNAME record to your DNS provider (or if using DuckDNS, request an ACM certificate using Route 53 or deploy Let's Encrypt Certbot directly on the Nginx gateway).

---

## 5. Setting Up the Application Load Balancer (ALB)

1. Navigate to **EC2** &rarr; **Load Balancers** &rarr; **Create Application Load Balancer**.
2. **Name**: `pocketpilot-alb`.
3. **Scheme**: Internet-facing.
4. **VPC & Subnets**: Select at least two Availability Zones (e.g., `us-east-1a` and `us-east-1b`).
5. **Security Group**: Assign `pocketpilot-alb-sg`.
6. **Listeners & Routing**:
   - **HTTPS (Port 443)**:
     - Default Action: Forward to Target Group `pocketpilot-tg`.
     - Certificate: Select the ACM certificate for `pocketpilot.duckdns.org`.
   - **HTTP (Port 80)**:
     - Default Action: **Redirect to HTTPS** (Port 443, Status code: `HTTP_301`).
7. **Target Group (`pocketpilot-tg`)**:
   - Target type: Instances.
   - Protocol: HTTP (Port 80).
   - Health check path: `/healthz` (handled instantly by Nginx without hitting database, or `/api/health` for full-stack verification).
   - Healthy threshold: 2.
   - Unhealthy threshold: 3.
   - Timeout: 5 seconds.
   - Interval: 15 seconds.

---

## 6. EC2 Application Instances Provisioning

Launch two `t3.small` or `t3.micro` EC2 instances running **Ubuntu 24.04 LTS** in separate Availability Zones.

### Automated Bootstrapping via User Data Script:

```bash
#!/bin/bash
set -e

# Update packages
apt-get update && apt-get upgrade -y
apt-get install -y docker.io docker-compose git curl awscli

# Enable and start Docker
systemctl enable docker
systemctl start docker
usermod -aG docker ubuntu

# Clone PocketPilot repository
cd /home/ubuntu
git clone https://github.com/your-username/PocketPilot.git
cd PocketPilot

# Create production environment configuration
cat <<EOF > .env
ENVIRONMENT=production
PROJECT_NAME="PocketPilot — Student Expense Intelligence"
POSTGRES_USER=pocketpilot_admin
POSTGRES_PASSWORD=<RDS_MASTER_PASSWORD>
POSTGRES_DB=pocketpilot_db
DATABASE_URL=postgresql://pocketpilot_admin:<RDS_MASTER_PASSWORD>@<RDS_ENDPOINT>:5432/pocketpilot_db
SECRET_KEY=<GENERATED_32_CHAR_SECRET_KEY>
CORS_ORIGINS=["https://pocketpilot.duckdns.org", "http://pocketpilot.duckdns.org"]
DOMAIN=pocketpilot.duckdns.org
MAX_CSV_FILE_SIZE_BYTES=5242880
EOF

# Launch containers (omitting local postgres since external RDS is configured)
docker-compose -f docker-compose.prod.yml up -d --build
```

---

## 7. CloudWatch Monitoring & Logging

1. **ALB Access Logs**: Enable S3 access logging on the ALB to record all incoming student requests, client IPs, and response codes.
2. **Container Logs**: Configure Docker's `awslogs` log driver in `docker-compose.yml` to automatically stream FastAPI and Nginx logs directly to Amazon CloudWatch Log Groups (`/ecs/pocketpilot-backend` and `/ecs/pocketpilot-nginx`).
3. **Alarms**:
   - Alarm 1: ALB `TargetResponseTime` > 1.5s for 3 consecutive minutes.
   - Alarm 2: ALB `HTTPCode_Target_5XX_Count` > 5 in 1 minute.
   - Alarm 3: RDS `CPUUtilization` > 80% for 5 minutes.
