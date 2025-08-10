import { Module } from '@nestjs/common';
import { ProducerService } from './producer.service';
import { ProducerController } from './producer.controller';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';

@Module({
  providers: [ProducerService, RabbitMQService],
  controllers: [ProducerController],
  exports: [ProducerService],
})
export class ProducerModule {}
