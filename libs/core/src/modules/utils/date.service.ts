import { In, At } from '../..';

export class DateService {
  public static convertInToTime(inDate: In): string {
    const seconds = inDate.seconds + inDate.nanoseconds / 1000000000;
    return `${seconds}s`;
  }

  public static convertAtToDate(at: At, timeZoneOffsetSeconds: number): Date {
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
