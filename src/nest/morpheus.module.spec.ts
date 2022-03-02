import { MorpheusModule } from './morpheus.module';

describe(`MorpheusModule`, () => {
  describe(`forRoot`, () => {
    it('should create a MorpheusModule', () => {
      const morpheusModule = MorpheusModule.forRoot({
        host: 'localhost',
        port: 5984,
        scheme: 'neo4j',
        username: 'test',
        password: 'test',
      });
      expect(morpheusModule).toBeDefined();
    });
  });

  describe(`forRootAsync`, () => {
    it('should create a MorpheusModule ', () => {
      const morpheusModule = MorpheusModule.forRootAsync({
        useFactory: (someService) => ({
          host: someService(),
          port: 5984,
          scheme: 'neo4j',
          username: 'test',
          password: 'test',
        }),
        inject: [],
      });
      expect(morpheusModule).toBeDefined();
    });

    it('should throw an error if no factory is provided', () => {
      expect.assertions(1);
      try {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        MorpheusModule.forRootAsync({});
      } catch (error) {
        expect(error.message).toBe('You must provide a useFactory function');
      }
    });
  });
});
