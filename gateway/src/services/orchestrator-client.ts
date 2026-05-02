import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import type { Config } from '../config.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface CreateSandboxRequest {
  userId: string;
  labId: string;
  templateId: string;
}

interface CreateSandboxResponse {
  sandboxId: string;
  namespace: string;
  status: string;
}

interface DestroySandboxRequest {
  sandboxId: string;
}

interface ValidateQuizRequest {
  sandboxId: string;
  labId: string;
  answers: Record<string, any>;
}

interface ValidateQuizResponse {
  passed: boolean;
  score: number;
  results: Array<{
    questionId: string;
    correct: boolean;
    feedback: string;
  }>;
}

export class OrchestratorClient {
  private client: any;

  constructor(config: Config) {
    const protoPath = join(__dirname, '../../proto/orchestrator.proto');
    
    const packageDefinition = protoLoader.loadSync(protoPath, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
    });

    const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as any;
    const orchestratorProto = protoDescriptor.orchestrator;

    this.client = new orchestratorProto.OrchestratorService(
      config.orchestratorGrpcUrl,
      grpc.credentials.createInsecure()
    );
  }

  async createSandbox(request: CreateSandboxRequest): Promise<CreateSandboxResponse> {
    return new Promise((resolve, reject) => {
      this.client.CreateSandbox(request, (error: Error | null, response: CreateSandboxResponse) => {
        if (error) {
          reject(error);
        } else {
          resolve(response);
        }
      });
    });
  }

  async destroySandbox(request: DestroySandboxRequest): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.DestroySandbox(request, (error: Error | null) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  async validateQuiz(request: ValidateQuizRequest): Promise<ValidateQuizResponse> {
    return new Promise((resolve, reject) => {
      this.client.ValidateQuiz(request, (error: Error | null, response: ValidateQuizResponse) => {
        if (error) {
          reject(error);
        } else {
          resolve(response);
        }
      });
    });
  }

  execStream() {
    return this.client.ExecStream();
  }

  watchResources(sandboxId: string) {
    const stream = this.client.WatchResources({ sandboxId });
    return stream;
  }

  close() {
    grpc.closeClient(this.client);
  }
}
