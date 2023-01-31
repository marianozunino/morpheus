import { Test, TestingModule } from '@nestjs/testing';

import { LoggerService } from '../../logger.service';
import { ExecutionWrapperService } from '../execution-wrapper.service';

jest.mock('../../logger.service');

describe('ExecutionWrapperService', () => {
  let service: ExecutionWrapperService;
  let loggerService: jest.Mocked<LoggerService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExecutionWrapperService, LoggerService],
    }).compile();
    service = module.get<ExecutionWrapperService>(ExecutionWrapperService);
    loggerService = module.get(LoggerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(loggerService).toBeDefined();
  });

  describe('asyncExecutionWrapper', () => {
    it('executed the function and exits with code 0', async () => {
      const existSpy = jest.spyOn(process, 'exit').mockImplementation();
      const mockFunction = jest.fn();
      await service.asyncExecutionWrapper(mockFunction);
      expect(mockFunction).toHaveBeenCalled();
      expect(existSpy).toHaveBeenCalledWith(0);
      expect(loggerService.error).not.toHaveBeenCalled();
    });

    it('executed the function and exits with code 1', async () => {
      const existSpy = jest.spyOn(process, 'exit').mockImplementation();
      const mockFunction = jest.fn().mockRejectedValue(new Error('error'));
      await service.asyncExecutionWrapper(mockFunction);
      expect(mockFunction).toHaveBeenCalled();
      expect(existSpy).toHaveBeenCalledWith(1);
      expect(loggerService.error).toHaveBeenCalledWith('error');
    });
  });
});
