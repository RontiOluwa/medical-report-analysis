/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: 'axo-lab-analyzer',
      // In production, retain resources if the stack is accidentally deleted
      // In staging, remove everything cleanly
      removal: input?.stage === 'production' ? 'retain' : 'remove',
      home: 'aws',
      providers: {
        aws: { region: 'eu-west-1' },
      },
    };
  },

  async run() {
    // ── S3 bucket for PDF uploads ─────────────────────────────────────────────
    // SST creates and manages this bucket.
    // Linking it to the Next.js app automatically grants Lambda read/write access
    // via an IAM role — no hardcoded credentials needed in production.
    const pdfBucket = new sst.aws.Bucket('PDFBucket', {
      versioning: true, // keep previous versions for recovery
    });

    // ── Next.js app deployed to Lambda + CloudFront ───────────────────────────
    // SST handles everything:
    //   - Builds the Next.js app
    //   - Deploys static assets to S3
    //   - Deploys API routes as Lambda functions
    //   - Creates API Gateway to route requests to Lambda
    //   - Creates a CloudFront distribution in front of everything
    //   - Outputs the CloudFront URL when done
    new sst.aws.Nextjs('AxoLabAnalyzer', {
      // Link the PDF bucket — Lambda gets IAM permissions automatically
      link: [pdfBucket],

      // Environment variables injected into Lambda at runtime
      environment: {
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY!,
        OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? '',
        S3_PDF_BUCKET: pdfBucket.name,
      },

      // Lambda function settings
      server: {
        memory: '512 MB',   // enough for base64 encoding and JSON parsing
        timeout: '120 seconds', // accommodates Claude inference + retries
      },
    });
  },
});