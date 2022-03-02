import {
  DynamicModule,
  Logger,
  Module,
  ModuleMetadata,
  Provider,
} from '@nestjs/common';
import { MorpheusService } from './morpheus.service';
import { MorpheusModuleOptions } from './morpheus-service-options';

export interface MorpheusModuleOptionsFactory {
  createObjectionModuleOptions():
    | Promise<MorpheusModuleOptions>
    | MorpheusModuleOptions;
}

export interface MorpheusModuleAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  useFactory: (
    ...args: any[]
  ) => MorpheusModuleOptions | Promise<MorpheusModuleOptions>;
  inject?: any[];
}

@Module({})
export class MorpheusModule {
  private static readonly logger = new Logger(MorpheusModule.name);

  static forRoot(options: MorpheusModuleOptions): DynamicModule {
    const providers = [
      {
        provide: MorpheusService,
        useValue: new MorpheusService(options),
      },
    ];

    return {
      providers: providers,
      exports: providers,
      module: MorpheusModule,
    };
  }

  public static forRootAsync(
    options: MorpheusModuleAsyncOptions,
  ): DynamicModule {
    const providers = [...this.createAsyncProviders(options)];
    return {
      module: MorpheusModule,
      imports: options.imports,
      providers: providers,
      exports: providers,
    };
  }

  private static createAsyncProviders(
    options: MorpheusModuleAsyncOptions,
  ): Provider[] {
    if (options.useFactory) {
      return [
        {
          provide: MorpheusModule,
          useFactory: this.createFactoryWrapper(options.useFactory),
          inject: options.inject || [],
        },
      ];
    }
    this.logger.error(
      'MorpheusModule.forRootAsync() requires a useFactory function',
    );
    throw new Error('You must provide a useFactory function');
  }

  private static createFactoryWrapper(
    useFactory: MorpheusModuleAsyncOptions['useFactory'],
  ) {
    return async (...args: any[]) => {
      const clientOptions = await useFactory(...args);
      return new MorpheusService(clientOptions);
    };
  }
}
