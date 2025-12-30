/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Readable } from 'stream';

interface TTSStreamResult {
  audioStream: Readable;
}

@Injectable()
export class AudioService {
  private async createTTS() {
    const { MsEdgeTTS, OUTPUT_FORMAT } = await import('msedge-tts');
    const tts = new MsEdgeTTS();
    return { tts, OUTPUT_FORMAT };
  }

  async speak(text: string, voice = 'en-NG-EzinneNeural'): Promise<Readable> {
    try {
      if (!text || text.trim().length === 0) {
        throw new Error('Text cannot be empty');
      }

      // Create fresh instance each time
      const { tts, OUTPUT_FORMAT } = await this.createTTS();

      await tts.setMetadata(
        voice,
        OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3,
      );

      const result = tts.toStream(text) as unknown as TTSStreamResult;

      return result.audioStream;
    } catch (err) {
      console.log('Error in AudioService.speak:', err);
      throw new InternalServerErrorException(
        `Audio generation failed: ${String(err)}`,
      );
    }
  }

  async speakToBuffer(
    text: string,
    voice = 'en-NG-EzinneNeural',
  ): Promise<Buffer> {
    const audioStream = await this.speak(text, voice);

    const chunks: Buffer[] = [];
    for await (const chunk of audioStream) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      chunks.push(chunk);
    }

    return Buffer.concat(chunks);
  }
}
