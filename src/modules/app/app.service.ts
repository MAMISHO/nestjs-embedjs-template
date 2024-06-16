import { Inject, Injectable } from '@nestjs/common';
import { EmbedService } from '../embedjs/embedjs.service.js';

@Injectable()
export class AppService {
    @Inject()
    private embedService: EmbedService;

    async getHello(): Promise<string> {
        return (await this.embedService.query('Who is Adhityan?')).result;
    }

    async ask(question: string): Promise<string> {
        return (await this.embedService.query(question)).result;
    }
}
