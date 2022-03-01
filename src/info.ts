import { Repository } from './repository';
import { At, In, MigrationInfo } from './types';
import {
  getFileContentAndVersion,
  getFileNamesFromMigrationsFolder,
  getMigrationDescription,
} from './utils';

export class Info {
  private files: { version: string; file: string; description: string }[];
  constructor(private readonly repository: Repository) {}

  async getInfo() {
    await this.getAllMigrationFiles();
    if (this.files.length > 0) {
      const info = await this.repository.getMigrationInfo();
      this.printTable(info);
    } else {
      console.log('No migrations found');
    }
  }

  private async getAllMigrationFiles(): Promise<void> {
    const migrationFiles = await getFileNamesFromMigrationsFolder();
    this.files = migrationFiles.map((file) => {
      const { version } = getFileContentAndVersion(file);
      const description = getMigrationDescription(file);
      return { version, file, description };
    });
  }

  private printTable(info: MigrationInfo[]) {
    const timeZoneOffsetSeconds = new Date().getTimezoneOffset() * 60;
    const table = this.files.map((file) => {
      const migration = info.find(
        (migration) => migration.node.version === file.version,
      );
      if (migration) {
        const installedOn = this.convertAtToDate(
          migration.relation.at,
          timeZoneOffsetSeconds,
        );
        const executionTime = this.convertInToTime(migration.relation.in);

        return {
          Version: migration.node.version,
          Description: migration.node.description,
          Type: migration.node.type,
          InstalledOn: installedOn.toLocaleString(),
          ExecutionTime: executionTime,
          State: 'MIGRATED',
          Source: migration.node.source,
        };
      } else {
        return {
          Version: file.version,
          Description: file.description,
          Type: 'CYPHER',
          InstalledOn: '',
          ExecutionTime: '',
          State: 'PENDING',
          Source: file.file,
        };
      }
    });

    console.table(table);
  }

  private convertInToTime(inDate: In): string {
    const seconds = inDate.seconds + inDate.nanoseconds / 1000000000;
    return `${seconds}s`;
  }

  private convertAtToDate(at: At, timeZoneOffsetSeconds: number): Date {
    const date = new Date(
      at.year,
      at.month - 1,
      at.day,
      at.hour,
      at.minute,
      at.second,
      at.nanosecond / 1000,
    );
    date.setSeconds(date.getSeconds() - timeZoneOffsetSeconds);
    return date;
  }
}
