import {
  Controller,
  Get,
  Query,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { AudioService } from './audio.service';

@Controller('audio')
export class AudioController {
  constructor(private readonly audioService: AudioService) {}

  @Get('speak')
  async speak(
    @Query('text') text: string,
    @Query('voice') voice: string,
    @Res() res: Response,
  ) {
    if (!text) {
      throw new BadRequestException('Query parameter "text" is required');
    }

    const audioStream = await this.audioService.speak(text, voice);
    // console.log('Generated audio stream for text:', audioStream);

    res.set({
      'Content-Type': 'audio/mpeg',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-store',
    });

    audioStream.pipe(res);
  }
}
