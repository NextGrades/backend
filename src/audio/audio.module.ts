import { Module } from '@nestjs/common';
import { AudioController } from 'src/audio/audio.controller';
import { AudioService } from 'src/audio/audio.service';

@Module({
  controllers: [AudioController],
  providers: [AudioService],
})
export class AudioModule {}
