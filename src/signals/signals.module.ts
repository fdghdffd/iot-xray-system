import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Signal, SignalSchema } from './schemas/signal.schema';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';
import { SignalsService } from './signals.service';
import { SignalsController } from './signals.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Signal.name, schema: SignalSchema }]),
  ],
  providers: [SignalsService, RabbitMQService],
  controllers: [SignalsController],
  exports: [SignalsService],
})
export class SignalsModule {}
