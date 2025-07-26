import { Test, TestingModule } from '@nestjs/testing';
import { IgBotService } from './ig-bot.service';

describe('IgBotService', () => {
  let service: IgBotService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IgBotService],
    }).compile();

    service = module.get<IgBotService>(IgBotService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
