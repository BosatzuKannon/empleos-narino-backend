# Empleos Nariño - Backend API (NestJS)

A backend monolith for the Empleos Nariño mobile app, refactored from a serverless microservices architecture to an optimized NestJS Docker container.

## Architecture and Tech Stack
* **Framework:** NestJS
* **Database:** DynamoDB (Single Table Design via AWS SDK v3)
* **Deployment:** AWS ECR + AWS App Runner (via Docker)
* **CI/CD:** GitHub Actions

## Local Setup
1. Install dependencies: `npm install`
2. Configure environment variables (AWS Credentials) in the `.env` file.
3. Start the server: `npm run start:dev`