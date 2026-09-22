import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {logError} from '../errors/AppError';
import {Colors} from '../theme/colors';

export default class AppErrorBoundary extends React.Component<
  React.PropsWithChildren,
  {failed: boolean}
> {
  state = {failed: false};
  static getDerivedStateFromError() {
    return {failed: true};
  }
  componentDidCatch(error: Error) {
    logError(error);
  }
  render() {
    if (!this.state.failed) {
      return this.props.children;
    }
    return (
      <View style={styles.root}>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.message}>
          Please reopen the app or try again. If the problem continues, contact
          the hospital for assistance.
        </Text>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => this.setState({failed: false})}
          style={styles.button}>
          <Text style={styles.action}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }
}
const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    padding: 28,
    backgroundColor: Colors.white,
  },
  title: {fontSize: 20, color: Colors.textDark, fontWeight: '700'},
  message: {fontSize: 14, color: Colors.textMid, marginVertical: 16},
  button: {
    padding: 14,
    backgroundColor: Colors.redPrimary,
    borderRadius: 12,
    alignItems: 'center',
  },
  action: {color: Colors.white, fontWeight: '700'},
});
