import { existsSync, unlinkSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { readMorpheusConfig } from '../src/config';

describe('config', () => {
  describe('readMorpheusConfig', () => {
    beforeEach(() => {
      jest.spyOn(console, 'error').mockImplementation(() => {
        //
      });
      const configPath = resolve(process.cwd(), '.morpheus.json');
      if (existsSync(configPath)) {
        unlinkSync(configPath);
      }
      // clean env variables
      delete process.env.NEO4J_SCHEME;
      delete process.env.NEO4J_HOST;
      delete process.env.NEO4J_PORT;
      delete process.env.NEO4J_USERNAME;
      delete process.env.NEO4J_PASSWORD;
    });
    it('should fail to read an inexistent file', () => {
      expect.assertions(1);
      try {
        readMorpheusConfig();
      } catch (error) {
        expect(error).toMatchInlineSnapshot(
          `[AssertionError: Couldn't find a valid .morpheus.json file]`,
        );
      }
    });

    it('should read read an empty .morpheus.json file ', () => {
      resolve(process.cwd(), '.morpheus.json');
      writeFileSync('.morpheus.json', '');
      expect.assertions(3);
      jest.spyOn(JSON, 'parse');
      try {
        readMorpheusConfig();
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
      resolve(process.cwd(), '.morpheus.json');
      writeFileSync('.morpheus.json', '{}');
      jest.spyOn(JSON, 'parse');
      try {
        readMorpheusConfig();
      } catch (error) {
        expect(JSON.parse).toHaveBeenCalled();
        expect(error).toMatchInlineSnapshot(`[Error: Invalid config]`);
        expect(console.error).toHaveBeenCalledWith('"scheme" is required');
      }
    });

    it('should validate .morpheus.json file ', () => {
      const path = resolve(process.cwd(), '.morpheus.json');
      writeFileSync(
        path,
        `{
      "scheme": "neo4j",
      "host": "localhost",
      "port": 7687,
      "username": "neo4j",
      "password": "neo4j"
          }`,
      );
      jest.spyOn(JSON, 'parse');
      const config = readMorpheusConfig();
      expect(JSON.parse).toHaveBeenCalled();
      expect(config).toMatchInlineSnapshot(`
        Object {
          "host": "localhost",
          "password": "neo4j",
          "port": 7687,
          "scheme": "neo4j",
          "username": "neo4j",
        }
      `);
    });

    it('should report invalid properties in .morpheus.json file ', () => {
      expect.assertions(3);
      const path = resolve(process.cwd(), '.morpheus.json');
      writeFileSync(
        path,
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
        readMorpheusConfig();
      } catch (error) {
        expect(JSON.parse).toHaveBeenCalled();
        expect(error).toMatchInlineSnapshot(`[Error: Invalid config]`);
        expect(console.error).toHaveBeenCalledWith('"scheme" is required');
      }
    });

    it('should read from config from ENV', () => {
      process.env.NEO4J_SCHEME = 'neo4j';
      process.env.NEO4J_HOST = 'localhost';
      process.env.NEO4J_PORT = '7687';
      process.env.NEO4J_USERNAME = 'neo4j';
      process.env.NEO4J_PASSWORD = 'neo4j';

      const config = readMorpheusConfig();
      expect(config).toMatchInlineSnapshot(`
          Object {
            "host": "localhost",
            "password": "neo4j",
            "port": 7687,
            "scheme": "neo4j",
            "username": "neo4j",
          }
        `);
    });
  });
});
