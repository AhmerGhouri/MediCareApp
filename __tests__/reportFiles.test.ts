import {beforeEach, describe, expect, it, jest} from '@jest/globals';
import ReactNativeBlobUtil from 'react-native-blob-util';
import {
  openReport,
  validateDownloadedReport,
} from '../src/services/reportFiles';
import {reportError} from '../src/errors/errorEvents';

jest.mock('../src/errors/errorEvents', () => ({reportError: jest.fn()}));
jest.mock('react-native-blob-util', () => ({
  fs: {
    dirs: {CacheDir: '/cache'},
    slice: jest.fn(),
    readFile: jest.fn(),
    exists: jest.fn(),
    unlink: jest.fn(),
  },
  android: {actionViewIntent: jest.fn()},
  ios: {previewDocument: jest.fn()},
}));
const response = (status: number) => ({
  info: () => ({status}),
  path: () => '/download/report.pdf',
});
beforeEach(() => {
  jest.clearAllMocks();
  (
    ReactNativeBlobUtil.fs.exists as jest.MockedFunction<
      typeof ReactNativeBlobUtil.fs.exists
    >
  ).mockResolvedValue(true);
});
describe('report failures', () => {
  it('rejects an HTML error page returned with HTTP 200', async () => {
    (
      ReactNativeBlobUtil.fs.readFile as jest.MockedFunction<
        typeof ReactNativeBlobUtil.fs.readFile
      >
    ).mockResolvedValue('<html');
    await expect(validateDownloadedReport(response(200))).rejects.toMatchObject(
      {kind: 'download'},
    );
    expect(ReactNativeBlobUtil.fs.unlink).toHaveBeenCalled();
  });
  it('accepts a PDF signature and checks only five bytes', async () => {
    (
      ReactNativeBlobUtil.fs.readFile as jest.MockedFunction<
        typeof ReactNativeBlobUtil.fs.readFile
      >
    ).mockResolvedValue('%PDF-');
    await expect(
      validateDownloadedReport(response(200)),
    ).resolves.toBeUndefined();
    expect(ReactNativeBlobUtil.fs.slice).toHaveBeenCalledWith(
      '/download/report.pdf',
      expect.any(String),
      0,
      5,
    );
  });
  it('rejects a server failure before opening the downloaded file', async () => {
    await expect(validateDownloadedReport(response(503))).rejects.toMatchObject(
      {kind: 'server'},
    );
    expect(ReactNativeBlobUtil.fs.slice).not.toHaveBeenCalled();
  });
  it('shows a friendly error when a report no longer exists', async () => {
    (
      ReactNativeBlobUtil.fs.exists as jest.MockedFunction<
        typeof ReactNativeBlobUtil.fs.exists
      >
    ).mockResolvedValue(false);
    await openReport('/missing/report.pdf');
    expect(reportError).toHaveBeenCalledWith(
      expect.objectContaining({kind: 'fileOpen'}),
      'fileOpen',
    );
  });
});
