import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Subject } from 'rxjs';

@Injectable()
export class SseService {
  private events$ = new Subject<any>();

  getStream() {
    return this.events$.asObservable();
  }

  // Listen to internal events
  @OnEvent('job.update')
  handleNotification(payload: any) {
    this.events$.next(payload);
  }
}
