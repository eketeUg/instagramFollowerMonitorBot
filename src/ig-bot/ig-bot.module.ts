import { Module } from '@nestjs/common';
import { IgBotService } from './ig-bot.service';
import { HttpModule } from '@nestjs/axios';
import { MongooseModule } from '@nestjs/mongoose';
import { Account, AccountSchema } from 'src/database/schemas/account.schema';

@Module({
  imports: [
    HttpModule,
    MongooseModule.forFeature([{ name: Account.name, schema: AccountSchema }]),
  ],
  providers: [IgBotService],
})
export class IgBotModule {}
