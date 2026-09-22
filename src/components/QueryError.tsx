import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {normalizeError} from '../errors/AppError';
import {Colors} from '../theme/colors';

export default function QueryError({
  error,
  onRetry,
  hasData = false,
  label,
  retrying = false,
}: {
  error: unknown;
  onRetry?: () => unknown;
  hasData?: boolean;
  label?: string;
  retrying?: boolean;
}) {
  if (!error) {
    return null;
  }
  const safe = normalizeError(error);
  if (safe.kind === 'cancelled' || safe.kind === 'session') {
    return null;
  }
  return (
    <View style={styles.box} accessibilityLiveRegion="polite">
      <Text style={styles.title}>
        {label ? `${label}: ` : ''}
        {hasData ? 'Could not refresh' : safe.title}
      </Text>
      <Text style={styles.message}>
        {hasData ? 'Showing previously loaded information. ' : ''}
        {safe.message}
      </Text>
      {!!onRetry && (
        <TouchableOpacity
          accessibilityRole="button"
          disabled={retrying}
          onPress={() => {
            onRetry();
          }}
          style={styles.button}>
          <Text style={styles.action}>{retrying ? 'Retrying…' : 'Retry'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  box: {
    padding: 16,
    margin: 12,
    borderRadius: 12,
    backgroundColor: Colors.redPale,
  },
  title: {color: Colors.redPrimary, fontWeight: '700', fontSize: 14},
  message: {color: Colors.textMid, marginTop: 6, fontSize: 13},
  button: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 6,
  },
  action: {color: Colors.redPrimary, fontWeight: '700'},
});
