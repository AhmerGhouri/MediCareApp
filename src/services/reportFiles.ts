import {Platform, Share} from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
import {AppError, logError, normalizeError} from '../errors/AppError';
import {reportError} from '../errors/errorEvents';

// Inspect only the PDF signature, not the report contents. Some report servers
// return an HTML error page with HTTP 200, which must not be shown as success.
export async function validateDownloadedReport(response: {
  info: () => {status: number};
  path: () => string;
}): Promise<void> {
  const status = response.info().status;
  if (status >= 400) {
    const error = normalizeError({status}, 'download');
    // The legacy report server is separate from the authenticated app API.
    throw error.kind === 'session' ? new AppError('download', status) : error;
  }
  const fs = ReactNativeBlobUtil.fs;
  const probe = `${fs.dirs.CacheDir}/report-check-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}.tmp`;
  try {
    await fs.slice(response.path(), probe, 0, 5);
    if ((await fs.readFile(probe, 'utf8')) !== '%PDF-') {
      throw new AppError('download');
    }
  } finally {
    try {
      if (await fs.exists(probe)) {
        await fs.unlink(probe);
      }
    } catch (error) {
      logError(error, 'storage');
    }
  }
}

export async function openReport(filePath: string): Promise<void> {
  try {
    const path = filePath.replace(/^file:\/\//, '');
    if (!(await ReactNativeBlobUtil.fs.exists(path))) {
      throw new AppError('fileOpen');
    }
    if (Platform.OS === 'android') {
      await ReactNativeBlobUtil.android.actionViewIntent(
        path,
        'application/pdf',
      );
    } else {
      await ReactNativeBlobUtil.ios.previewDocument(path);
    }
  } catch (error) {
    reportError(error, 'fileOpen');
  }
}

export async function shareReport(filePath: string): Promise<void> {
  try {
    if (
      !(await ReactNativeBlobUtil.fs.exists(filePath.replace(/^file:\/\//, '')))
    ) {
      throw new AppError('fileOpen');
    }
    await Share.share({
      url: filePath.startsWith('file://') ? filePath : `file://${filePath}`,
    });
  } catch (error) {
    reportError(error, 'fileOpen');
  }
}
