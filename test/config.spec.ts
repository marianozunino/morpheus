import { writeFileSync } from 'fs';
import rimraf from 'rimraf';
import { Neo4jConfig } from '../src/neo4j';
import { MORPHEUS_FILE_NAME } from '../src/types';
import { Config } from '../src/config';

describe('config', () => {
  describe('readMorpheusConfig', () => {
    beforeEach(() => {
      jest.spyOn(console, 'error');

      rimraf.sync(MORPHEUS_FILE_NAME);
      // clean env variables
      delete process.env.MORPHEUS_SCHEME;
      delete process.env.MORPHEUS_HOST;
      delete process.env.MORPHEUS_PORT;
      delete process.env.MORPHEUS_USERNAME;
      delete process.env.MORPHEUS_PASSWORD;
      delete process.env.MORPHEUS_MIGRATIONS_PATH;

      delete process.env.NEO4J_SCHEME;
      delete process.env.NEO4J_HOST;
      delete process.env.NEO4J_PORT;
      delete process.env.NEO4J_USERNAME;
      delete process.env.NEO4J_PASSWORD;
      Config['config'] = undefined;
    });
    it('should fail to read an inexistent file', () => {
      expect.assertions(1);
      try {
        Config.getConfig();
      } catch (error) {
        expect(error).toMatchInlineSnapshot(
          `[AssertionError: Couldn't find a valid .morpheus.json file]`,
        );
      }
    });

    it('should read read an empty .morpheus.json file ', () => {
      writeFileSync(MORPHEUS_FILE_NAME, '');
      expect.assertions(3);
      jest.spyOn(JSON, 'parse');
      try {
        Config.getConfig();
      } catch (error) {
        expect(JSON.parse).toHaveBeenCalled();
        expect(JSON.parse).toThrowErrorMatchingInlineSnapshot(
          `"Unexpected token u in JSON at position 0"`,
        );
        expect(error).toMatchInlineSnapshot(
          `[Error: Couldn't parse .morpheus.json file]`,
        );
      }
    });

    it('should read an invalid .morpheus.json file ', () => {
      expect.assertions(3);
      writeFileSync(MORPHEUS_FILE_NAME, '{}');
      jest.spyOn(JSON, 'parse');
      try {
        Config.getConfig();
      } catch (error) {
        expect(JSON.parse).toHaveBeenCalled();
        expect(error).toMatchInlineSnapshot(`[Error: Invalid config]`);
        expect(console.error).toHaveBeenCalledWith('"scheme" is required');
      }
    });

    it('should validate .morpheus.json file ', () => {
      writeFileSync(
        MORPHEUS_FILE_NAME,
        `{
      "scheme": "neo4j",
      "host": "localhost",
      "port": 7687,
      "username": "neo4j",
      "password": "neo4j"
          }`,
      );
      jest.spyOn(JSON, 'parse');
      const config = Config.getConfig();
      expect(JSON.parse).toHaveBeenCalled();
      expect(config).toMatchInlineSnapshot(`
        Object {
          "host": "localhost",
          "migrationsPath": "neo4j/migrations",
          "password": "neo4j",
          "port": 7687,
          "scheme": "neo4j",
          "username": "neo4j",
        }
      `);
    });

    it('should report invalid properties in .morpheus.json file ', () => {
      expect.assertions(3);
      writeFileSync(
        MORPHEUS_FILE_NAME,
        `{
      "scheme": "invalid",
      "host": "localhost",
      "port": 7687,
      "username": "neo4j",
      "password": "neo4j"
          }`,
      );
      jest.spyOn(JSON, 'parse');
      try {
        Config.getConfig();
      } catch (error) {
        expect(JSON.parse).toHaveBeenCalled();
        expect(error).toMatchInlineSnapshot(`[Error: Invalid config]`);
        expect(console.error).toHaveBeenCalledWith(
          '"scheme" must be one of [neo4j, neo4j+s, neo4j+ssc, bolt, bolt+s, bolt+ssc]',
        );
      }
    });

    it('should read from config from ENV', () => {
      process.env.NEO4J_SCHEME = 'neo4j';
      process.env.NEO4J_HOST = 'localhost';
      process.env.NEO4J_PORT = '7687';
      process.env.NEO4J_USERNAME = 'neo4j';
      process.env.NEO4J_PASSWORD = 'neo4j';

      const config = Config.getConfig();
      expect(config).toMatchInlineSnapshot(`
        Object {
          "host": "localhost",
          "migrationsPath": "neo4j/migrations",
          "password": "neo4j",
          "port": 7687,
          "scheme": "neo4j",
          "username": "neo4j",
        }
      `);
    });

    it('should support new env variables', () => {
      process.env.MORPHEUS_SCHEME = 'neo4j';
      process.env.MORPHEUS_HOST = 'localhost';
      process.env.MORPHEUS_PORT = '7687';
      process.env.MORPHEUS_USERNAME = 'neo4j';
      process.env.MORPHEUS_PASSWORD = 'neo4j';

      const config = Config.getConfig();
      expect(config).toMatchInlineSnapshot(`
        Object {
          "host": "localhost",
          "migrationsPath": "neo4j/migrations",
          "password": "neo4j",
          "port": 7687,
          "scheme": "neo4j",
          "username": "neo4j",
        }
      `);
    });

    describe('support custom migrations path', () => {
      it('using MORPHEUS env variables', () => {
        process.env.MORPHEUS_SCHEME = 'neo4j';
        process.env.MORPHEUS_HOST = 'localhost';
        process.env.MORPHEUS_PORT = '7687';
        process.env.MORPHEUS_USERNAME = 'neo4j';
        process.env.MORPHEUS_PASSWORD = 'neo4j';
        process.env.MORPHEUS_MIGRATIONS_PATH = 'customPath';

        const config = Config.getConfig();
        expect(config).toMatchInlineSnapshot(`
          Object {
            "host": "localhost",
            "migrationsPath": "customPath",
            "password": "neo4j",
            "port": 7687,
            "scheme": "neo4j",
            "username": "neo4j",
          }
        `);
      });

      it('using .morpheus.json file ', () => {
        const neo4jConfig: Neo4jConfig = {
          scheme: 'bolt',
          host: 'localhost',
          port: 7687,
          username: 'neo4j',
          password: 'neo4j',
          migrationsPath: 'customPath',
        };

        writeFileSync(MORPHEUS_FILE_NAME, JSON.stringify(neo4jConfig));
        const config = Config.getConfig();
        expect(config).toMatchInlineSnapshot(`
          Object {
            "host": "localhost",
            "migrationsPath": "customPath",
            "password": "neo4j",
            "port": 7687,
            "scheme": "bolt",
            "username": "neo4j",
          }
        `);
      });
    });
  });
});
