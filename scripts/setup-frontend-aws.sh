#!/bin/bash
# Frontend AWS Setup — creates S3 bucket + CloudFront distribution for the React app.
# Usage:
#   chmod +x setup-frontend-aws.sh
#   ./setup-frontend-aws.sh prod   # production
#   ./setup-frontend-aws.sh dev    # dev / staging
#
# Prerequisites:
#   - AWS CLI v2 installed and configured (aws configure)
#   - Sufficient IAM permissions: s3:*, cloudfront:*, iam:CreateServiceLinkedRole

set -euo pipefail

ENV=${1:-prod}
REGION=${AWS_REGION:-us-east-1}
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Bucket names must be globally unique; append account id to help ensure that.
if [ "$ENV" = "dev" ]; then
  BUCKET_NAME="resale-dashboard-dev-${ACCOUNT_ID}"
else
  BUCKET_NAME="resale-dashboard-prod-${ACCOUNT_ID}"
fi

echo "==> Setting up $ENV frontend infrastructure"
echo "    Region  : $REGION"
echo "    Bucket  : $BUCKET_NAME"
echo ""

# ── S3 bucket ────────────────────────────────────────────────────────────────
echo "==> Creating S3 bucket..."

if [ "$REGION" = "us-east-1" ]; then
  aws s3api create-bucket \
    --bucket "$BUCKET_NAME" \
    --region "$REGION"
else
  aws s3api create-bucket \
    --bucket "$BUCKET_NAME" \
    --region "$REGION" \
    --create-bucket-configuration LocationConstraint="$REGION"
fi

# Block all public access — CloudFront will be the only entry point via OAC
aws s3api put-public-access-block \
  --bucket "$BUCKET_NAME" \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

echo "    Bucket created and public access blocked."

# ── CloudFront Origin Access Control ─────────────────────────────────────────
echo "==> Creating CloudFront Origin Access Control (OAC)..."

OAC_CONFIG=$(cat <<JSON
{
  "Name": "resale-dashboard-${ENV}-oac",
  "Description": "OAC for resale-dashboard ${ENV} S3 bucket",
  "SigningProtocol": "sigv4",
  "SigningBehavior": "always",
  "OriginAccessControlOriginType": "s3"
}
JSON
)

OAC_ID=$(aws cloudfront create-origin-access-control \
  --origin-access-control-config "$OAC_CONFIG" \
  --query 'OriginAccessControl.Id' \
  --output text)

echo "    OAC ID: $OAC_ID"

# ── CloudFront distribution ───────────────────────────────────────────────────
echo "==> Creating CloudFront distribution (this takes ~2 minutes)..."

CALLER_REF="resale-dashboard-${ENV}-$(date +%s)"
S3_DOMAIN="${BUCKET_NAME}.s3.${REGION}.amazonaws.com"

DIST_CONFIG=$(cat <<JSON
{
  "CallerReference": "${CALLER_REF}",
  "Comment": "resale-dashboard ${ENV} frontend",
  "DefaultRootObject": "index.html",
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "s3-origin",
        "DomainName": "${S3_DOMAIN}",
        "S3OriginConfig": { "OriginAccessIdentity": "" },
        "OriginAccessControlId": "${OAC_ID}"
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "s3-origin",
    "ViewerProtocolPolicy": "redirect-to-https",
    "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6",
    "Compress": true,
    "AllowedMethods": {
      "Quantity": 2,
      "Items": ["GET", "HEAD"]
    }
  },
  "CustomErrorResponses": {
    "Quantity": 1,
    "Items": [
      {
        "ErrorCode": 403,
        "ResponsePagePath": "/index.html",
        "ResponseCode": "200",
        "ErrorCachingMinTTL": 0
      }
    ]
  },
  "PriceClass": "PriceClass_100",
  "Enabled": true,
  "HttpVersion": "http2and3"
}
JSON
)

DIST_OUTPUT=$(aws cloudfront create-distribution \
  --distribution-config "$DIST_CONFIG")

DIST_ID=$(echo "$DIST_OUTPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['Distribution']['Id'])")
CF_DOMAIN=$(echo "$DIST_OUTPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['Distribution']['DomainName'])")

echo "    Distribution ID : $DIST_ID"
echo "    CloudFront URL  : https://${CF_DOMAIN}"

# ── S3 bucket policy — allow CloudFront OAC to read ──────────────────────────
echo "==> Attaching bucket policy for CloudFront OAC..."

BUCKET_POLICY=$(cat <<JSON
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontOAC",
      "Effect": "Allow",
      "Principal": { "Service": "cloudfront.amazonaws.com" },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::${BUCKET_NAME}/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::${ACCOUNT_ID}:distribution/${DIST_ID}"
        }
      }
    }
  ]
}
JSON
)

aws s3api put-bucket-policy \
  --bucket "$BUCKET_NAME" \
  --policy "$BUCKET_POLICY"

echo "    Bucket policy applied."

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "==> Done! Infrastructure ready."
echo ""
echo "    S3 Bucket       : $BUCKET_NAME"
echo "    CloudFront ID   : $DIST_ID"
echo "    CloudFront URL  : https://${CF_DOMAIN}"
echo ""
echo "    Next steps:"
echo "    1. Add these GitHub secrets:"
if [ "$ENV" = "prod" ]; then
  echo "         S3_BUCKET_PROD        = $BUCKET_NAME"
  echo "         CLOUDFRONT_DIST_PROD  = $DIST_ID"
  echo "         PROD_API_URL          = https://<EC2-public-DNS>"
else
  echo "         S3_BUCKET_DEV         = $BUCKET_NAME"
  echo "         CLOUDFRONT_DIST_DEV   = $DIST_ID"
  echo "         DEV_API_URL           = http://<EC2-public-DNS>"
fi
echo "    2. Update CORS_ORIGIN in your backend .env on EC2:"
echo "         CORS_ORIGIN=https://${CF_DOMAIN}"
echo "    3. Add all remaining GitHub secrets (see DEPLOYMENT.md)"
echo "    4. Push to trigger your first deploy — the build workflow"
echo "       will upload the frontend bundle to S3 and invalidate CloudFront."
echo ""
