import { Controller, Get, Post, Body } from '@nestjs/common';
import { AppService } from './app.service.js';

@Controller()
export class AppController {
    constructor(private readonly appService: AppService) {}

    @Get()
    getHello(): Promise<string> {
        return this.appService.getHello();
    }

    @Post()
    ask(@Body() questionBody: {question: string}): Promise<string> {
        return this.appService.ask(questionBody.question);
    }
}
