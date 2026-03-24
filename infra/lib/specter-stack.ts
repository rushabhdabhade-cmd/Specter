import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import { Construct } from 'constructs';

export class SpecterStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const ctx = {
            ecrRepoName:    this.node.tryGetContext('ecrRepoName')    ?? 'specter-web',
            ecsClusterName: this.node.tryGetContext('ecsClusterName') ?? 'specter-prod',
            ecsServiceName: this.node.tryGetContext('ecsServiceName') ?? 'specter-web',
            s3BucketName:   this.node.tryGetContext('s3BucketName')   ?? 'specter-screenshots-prod',
            secretName:     this.node.tryGetContext('secretName')     ?? 'specter/prod',
            taskCpu:        Number(this.node.tryGetContext('taskCpu')    ?? 1024),
            taskMemory:     Number(this.node.tryGetContext('taskMemory') ?? 3072),
            minTasks:       Number(this.node.tryGetContext('minTasks')   ?? 1),
            maxTasks:       Number(this.node.tryGetContext('maxTasks')   ?? 4),
            domain:         this.node.tryGetContext('domain')    as string ?? '',
            subdomain:      this.node.tryGetContext('subdomain') as string ?? '',
        };

        const hasDomain = !!ctx.domain && !!ctx.subdomain;

        // ── VPC — public subnets only, no NAT Gateway ──────────────────────────
        const vpc = new ec2.Vpc(this, 'Vpc', {
            maxAzs: 2,
            natGateways: 0,
            subnetConfiguration: [
                {
                    name: 'public',
                    subnetType: ec2.SubnetType.PUBLIC,
                    cidrMask: 24,
                },
            ],
        });

        // ── S3 bucket for screenshots ──────────────────────────────────────────
        const screenshotBucket = new s3.Bucket(this, 'Screenshots', {
            bucketName: ctx.s3BucketName,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            lifecycleRules: [
                {
                    // Auto-delete screenshots older than 90 days
                    expiration: cdk.Duration.days(90),
                },
            ],
        });

        // ── ECR repository ─────────────────────────────────────────────────────
        const repo = new ecr.Repository(this, 'Repo', {
            repositoryName: ctx.ecrRepoName,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            // Keep last 10 images, remove untagged after 1 day
            lifecycleRules: [
                { maxImageCount: 10 },
                {
                    tagStatus: ecr.TagStatus.UNTAGGED,
                    maxImageAge: cdk.Duration.days(1),
                },
            ],
        });

        // ── Secrets Manager — reference to manually-created secret ─────────────
        const appSecret = secretsmanager.Secret.fromSecretNameV2(
            this, 'AppSecret', ctx.secretName
        );

        // ── CloudWatch log group ───────────────────────────────────────────────
        const logGroup = new logs.LogGroup(this, 'Logs', {
            logGroupName: '/ecs/specter-web',
            retention: logs.RetentionDays.ONE_MONTH,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        // ── ECS cluster ────────────────────────────────────────────────────────
        const cluster = new ecs.Cluster(this, 'Cluster', {
            vpc,
            clusterName: ctx.ecsClusterName,
            containerInsights: false, // saves ~$3/month
        });

        // ── Task definition ────────────────────────────────────────────────────
        const taskDef = new ecs.FargateTaskDefinition(this, 'TaskDef', {
            cpu: ctx.taskCpu,
            memoryLimitMiB: ctx.taskMemory,
            family: 'specter-web',
        });

        // Grant task role write access to the screenshot bucket
        screenshotBucket.grantWrite(taskDef.taskRole);

        taskDef.addContainer('app', {
            image: ecs.ContainerImage.fromEcrRepository(repo, 'latest'),
            logging: ecs.LogDrivers.awsLogs({
                streamPrefix: 'specter',
                logGroup,
            }),
            environment: {
                NODE_ENV: 'production',
                S3_REGION: this.region,
                S3_BUCKET_NAME: ctx.s3BucketName,
            },
            secrets: {
                NEXT_PUBLIC_SUPABASE_URL:           ecs.Secret.fromSecretsManager(appSecret, 'NEXT_PUBLIC_SUPABASE_URL'),
                NEXT_PUBLIC_SUPABASE_ANON_KEY:      ecs.Secret.fromSecretsManager(appSecret, 'NEXT_PUBLIC_SUPABASE_ANON_KEY'),
                SUPABASE_SERVICE_ROLE_KEY:          ecs.Secret.fromSecretsManager(appSecret, 'SUPABASE_SERVICE_ROLE_KEY'),
                GEMINI_API_KEY:                     ecs.Secret.fromSecretsManager(appSecret, 'GEMINI_API_KEY'),
                OPENAI_API_KEY:                     ecs.Secret.fromSecretsManager(appSecret, 'OPENAI_API_KEY'),
                ANTHROPIC_API_KEY:                  ecs.Secret.fromSecretsManager(appSecret, 'ANTHROPIC_API_KEY'),
                ENCRYPTION_KEY:                     ecs.Secret.fromSecretsManager(appSecret, 'ENCRYPTION_KEY'),
                NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:  ecs.Secret.fromSecretsManager(appSecret, 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY'),
                CLERK_SECRET_KEY:                   ecs.Secret.fromSecretsManager(appSecret, 'CLERK_SECRET_KEY'),
                NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: ecs.Secret.fromSecretsManager(appSecret, 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'),
                STRIPE_SECRET_KEY:                  ecs.Secret.fromSecretsManager(appSecret, 'STRIPE_SECRET_KEY'),
                STRIPE_WEBHOOK_SECRET:              ecs.Secret.fromSecretsManager(appSecret, 'STRIPE_WEBHOOK_SECRET'),
            },
            portMappings: [{ containerPort: 3000 }],
            healthCheck: {
                command: ['CMD-SHELL', 'curl -f http://localhost:3000/api/health || exit 1'],
                interval: cdk.Duration.seconds(30),
                timeout: cdk.Duration.seconds(5),
                retries: 3,
                startPeriod: cdk.Duration.seconds(60),
            },
        });

        // ── Optional: ACM cert + Route 53 ─────────────────────────────────────
        let certificate: acm.ICertificate | undefined;
        let hostedZone: route53.IHostedZone | undefined;

        if (hasDomain) {
            hostedZone = route53.HostedZone.fromLookup(this, 'Zone', {
                domainName: ctx.domain,
            });
            certificate = new acm.Certificate(this, 'Cert', {
                domainName: ctx.subdomain,
                validation: acm.CertificateValidation.fromDns(hostedZone),
            });
        }

        // ── ALB + Fargate service ──────────────────────────────────────────────
        const albService = new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'Service', {
            cluster,
            taskDefinition: taskDef,
            serviceName: ctx.ecsServiceName,
            desiredCount: ctx.minTasks,
            publicLoadBalancer: true,
            assignPublicIp: true, // required — no NAT, tasks need direct internet for Chromium
            listenerPort: hasDomain ? 443 : 80,
            ...(hasDomain && certificate ? {
                certificate,
                redirectHTTP: true,
                domainName: ctx.subdomain,
                domainZone: hostedZone,
            } : {}),
            healthCheckGracePeriod: cdk.Duration.seconds(90),
        });

        albService.targetGroup.configureHealthCheck({
            path: '/api/health',
            healthyHttpCodes: '200',
            interval: cdk.Duration.seconds(30),
            timeout: cdk.Duration.seconds(5),
            healthyThresholdCount: 2,
            unhealthyThresholdCount: 3,
        });

        // ── Auto-scaling ───────────────────────────────────────────────────────
        const scaling = albService.service.autoScaleTaskCount({
            minCapacity: ctx.minTasks,
            maxCapacity: ctx.maxTasks,
        });

        scaling.scaleOnCpuUtilization('CpuScaling', {
            targetUtilizationPercent: 70,
            scaleInCooldown: cdk.Duration.seconds(120),
            scaleOutCooldown: cdk.Duration.seconds(60),
        });

        // ── Outputs ────────────────────────────────────────────────────────────
        new cdk.CfnOutput(this, 'LoadBalancerDNS', {
            value: albService.loadBalancer.loadBalancerDnsName,
            description: 'ALB DNS — use this for your DNS CNAME if no Route53',
        });
        new cdk.CfnOutput(this, 'ECRRepository', {
            value: repo.repositoryUri,
            description: 'ECR repo URI for docker push',
        });
        new cdk.CfnOutput(this, 'S3Bucket', {
            value: screenshotBucket.bucketName,
        });
    }
}
